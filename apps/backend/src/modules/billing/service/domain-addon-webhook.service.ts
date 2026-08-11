import { inject, injectable } from 'tsyringe';
import type Stripe from 'stripe';
import { Logger } from '@/core/logging';
import UserAddonSubscriptionRepository, {
	type TScheduledQuantityChange,
} from '../domain/repository/user-addon-subscription.repository';
import { type TUserAddonSubscription } from '../domain/entities/user-addon-subscription.entity';
import { AddonSubscriptionStatusTransitionService } from './addon-subscription-status-transition.service';
import { EnforceCustomDomainLimitUseCase } from '../useCase/enforce-custom-domain-limit.use-case';
import { StripeService, readUpcomingPhase, isEndingAtPeriodEnd } from './stripe.service';

/**
 * Handles the add-on branch of the Stripe webhook.
 *
 * Split out of {@link StripeWebhookService} because the quantity rules below have no counterpart
 * on the Pro path and would otherwise sit in the middle of it.
 */
@injectable()
export class DomainAddonWebhookService {
	constructor(
		@inject(Logger) private readonly logger: Logger,
		@inject(UserAddonSubscriptionRepository)
		private readonly addonSubscriptionRepository: UserAddonSubscriptionRepository,
		@inject(AddonSubscriptionStatusTransitionService)
		private readonly transitionService: AddonSubscriptionStatusTransitionService,
		@inject(EnforceCustomDomainLimitUseCase)
		private readonly enforceCustomDomainLimitUseCase: EnforceCustomDomainLimitUseCase,
		@inject(StripeService) private readonly stripeService: StripeService,
	) {}

	/**
	 * Applies a `created`, `updated` or post-checkout subscription state.
	 *
	 * Unlike the Pro handler this creates the row when it is missing instead of returning: Stripe
	 * regularly delivers `customer.subscription.created` before `checkout.session.completed`, and
	 * dropping that first event would lose the purchased quantity.
	 */
	async handleSubscriptionUpsert(
		subscription: Stripe.Subscription,
		context: {
			eventCreatedAt: Date;
			period: { periodStart: Date; periodEnd: Date };
			/**
			 * Re-read an already-known schedule instead of trusting the mirror. Set by the
			 * reconciliation sweep: a schedule can change its contents while keeping its id, and
			 * the cheap id comparison would otherwise never notice a lost
			 * `subscription_schedule.updated`.
			 */
			forceScheduleRefresh?: boolean;
		},
	): Promise<void> {
		const existing = await this.findExisting(subscription);
		const userId = existing?.userId ?? subscription.metadata?.clerkUserId;

		if (!userId) {
			this.logger.error('stripe.webhook.addon.missingUserId', {
				stripe: { subscriptionId: subscription.id },
			});
			return;
		}

		if (this.isStale(existing, context.eventCreatedAt)) {
			this.logger.warn('stripe.webhook.addon.staleEvent', {
				stripe: { subscriptionId: subscription.id, userId },
			});
			return;
		}

		const { periodStart, periodEnd } = context.period;
		// Stripe's quantity is the entitlement, full stop — including right after a schedule has
		// switched phases, which is how a deferred reduction reaches us.
		const quantity = subscription.items?.data?.[0]?.quantity ?? 1;
		const priceId = subscription.items?.data?.[0]?.price?.id ?? existing?.stripePriceId ?? '';
		const customerId =
			typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

		const previousStatus = existing?.status ?? '';
		const quantityChanged = !existing || existing.quantity !== quantity;
		const scheduledChange = await this.resolveScheduledChange(subscription, existing, {
			forceRefresh: context.forceScheduleRefresh ?? false,
		});
		const row = await this.addonSubscriptionRepository.upsertByUserAndType({
			userId,
			addonType: 'custom_domain',
			stripeCustomerId: customerId,
			stripeSubscriptionId: subscription.id,
			stripePriceId: priceId,
			status: subscription.status,
			quantity,
			currentPeriodStart: periodStart,
			currentPeriodEnd: periodEnd,
			cancelAtPeriodEnd: isEndingAtPeriodEnd(subscription),
			lastStripeEventAt: context.eventCreatedAt,
			scheduledChange,
		});

		// A changed quantity changes how many domains may be live, so the domains have to follow
		// straight away — including when the change was made in the Stripe portal rather than here.
		if (quantityChanged) {
			const { disabled } = await this.enforceCustomDomainLimitUseCase.execute(userId);
			if (disabled.length > 0) {
				this.logger.info('domainAddon.domainsDisabledByQuantityChange', {
					subscription: { userId, quantity, disabled },
				});
			}

			// This is how a deferred reduction reaches the user: Stripe moved into the next
			// schedule phase and the domains have just gone dark, so confirm what happened.
			if (existing && existing.scheduledQuantity === quantity && quantity < existing.quantity) {
				await this.transitionService.emitQuantityReduced({
					userId,
					stripeSubscriptionId: subscription.id,
					quantity,
				});
			}
		}

		const transitionInput = {
			userId,
			stripeSubscriptionId: subscription.id,
			stripePriceId: priceId,
			currentPeriodEnd: periodEnd,
			quantity,
		};

		await this.transitionService.handleTransition({
			...transitionInput,
			previousStatus,
			newStatus: subscription.status,
		});

		if (isEndingAtPeriodEnd(subscription) && !existing?.cancelAtPeriodEnd) {
			await this.transitionService.emitCancelInitiated(transitionInput);
		}
		if (!isEndingAtPeriodEnd(subscription) && existing?.cancelAtPeriodEnd) {
			await this.addonSubscriptionRepository.clearCancellationNotifications(row);
		}

		this.logger.info('stripe.webhook.addon.synced', {
			stripe: {
				userId,
				subscriptionId: subscription.id,
				previousStatus,
				newStatus: subscription.status,
				quantity,
			},
		});
	}

	async handleSubscriptionDeleted(
		subscription: Stripe.Subscription,
		context: { period: { periodEnd: Date } },
	): Promise<void> {
		const existing = await this.addonSubscriptionRepository.findByStripeSubscriptionId(
			subscription.id,
		);
		if (!existing) {
			this.logger.warn('stripe.webhook.addon.deleteNotFound', {
				stripe: { subscriptionId: subscription.id },
			});
			return;
		}

		// The row is reused when the user buys again, so a leftover scheduled quantity from the
		// subscription that just died would ride along into the new one.
		await this.addonSubscriptionRepository.update(existing, {
			status: 'canceled',
			cancelAtPeriodEnd: false,
			stripeScheduleId: null,
			scheduledQuantity: null,
			scheduledQuantityEffectiveAt: null,
		});

		await this.transitionService.emitCanceled({
			userId: existing.userId,
			stripeSubscriptionId: subscription.id,
			stripePriceId: existing.stripePriceId,
			currentPeriodEnd: context.period.periodEnd,
			quantity: existing.quantity,
		});

		this.logger.info('stripe.webhook.addon.deleted', {
			stripe: { userId: existing.userId, subscriptionId: subscription.id },
		});
	}

	/**
	 * Keeps the local view of a parked reduction in step with Stripe.
	 *
	 * Schedules do not only come from us — the Stripe portal creates them too, and it creates them
	 * for the Pro subscription as well, which is why an unknown schedule is ignored rather than
	 * guessed at. `lastStripeEventAt` is deliberately not written here: it guards the subscription
	 * stream, and bumping it from this one would start dropping genuine subscription events.
	 */
	async handleScheduleEvent(
		schedule: Stripe.SubscriptionSchedule,
		options: { cleared: boolean },
	): Promise<void> {
		const existing = await this.findBySchedule(schedule);
		if (!existing) return;

		if (options.cleared) {
			// A release event for a schedule we have already replaced would otherwise wipe the
			// replacement that is still pending.
			if (existing.stripeScheduleId !== schedule.id) return;

			await this.addonSubscriptionRepository.clearScheduledQuantity(existing);
			this.logger.info('stripe.webhook.addon.scheduleCleared', {
				stripe: { userId: existing.userId, scheduleId: schedule.id },
			});
			return;
		}

		const upcoming = readUpcomingPhase(schedule);
		if (!upcoming) {
			await this.addonSubscriptionRepository.clearScheduledQuantity(existing);
			return;
		}

		await this.addonSubscriptionRepository.setScheduledQuantity(existing, {
			stripeScheduleId: schedule.id,
			quantity: upcoming.quantity,
			effectiveAt: upcoming.effectiveAt,
		});

		this.logger.info('stripe.webhook.addon.scheduleSynced', {
			stripe: {
				userId: existing.userId,
				scheduleId: schedule.id,
				scheduledQuantity: upcoming.quantity,
			},
		});
	}

	async handlePaymentFailed(existing: TUserAddonSubscription): Promise<void> {
		await this.transitionService.emitPastDue({
			userId: existing.userId,
			stripeSubscriptionId: existing.stripeSubscriptionId,
			stripePriceId: existing.stripePriceId,
			currentPeriodEnd: existing.currentPeriodEnd,
			quantity: existing.quantity,
		});

		this.logger.info('stripe.webhook.addon.paymentFailed', {
			stripe: { userId: existing.userId, subscriptionId: existing.stripeSubscriptionId },
		});
	}

	/**
	 * Falls back to the user's row so a re-purchase after cancellation updates the existing record
	 * rather than colliding with the `(userId, addonType)` unique key.
	 */
	private async findExisting(
		subscription: Stripe.Subscription,
	): Promise<TUserAddonSubscription | undefined> {
		const bySubscription = await this.addonSubscriptionRepository.findByStripeSubscriptionId(
			subscription.id,
		);
		if (bySubscription) return bySubscription;

		const userId = subscription.metadata?.clerkUserId;
		if (!userId) return undefined;

		return this.addonSubscriptionRepository.findByUserAndType(userId, 'custom_domain');
	}

	/**
	 * Derives the schedule mirror from the subscription itself.
	 *
	 * `upsertByUserAndType` writes an explicit column list, so a mirror that is not recomputed here
	 * would never self-heal — after Stripe applied the reduction the UI would keep announcing it
	 * for a date in the past. `undefined` means "leave as is" and costs no API call.
	 */
	private async resolveScheduledChange(
		subscription: Stripe.Subscription,
		existing: TUserAddonSubscription | undefined,
		options: { forceRefresh: boolean },
	): Promise<TScheduledQuantityChange | null | undefined> {
		const scheduleId =
			typeof subscription.schedule === 'string'
				? subscription.schedule
				: (subscription.schedule?.id ?? null);

		if (!scheduleId) return existing?.stripeScheduleId ? null : undefined;
		// A known schedule normally needs no lookup — but its phases can be rewritten while the id
		// stays the same, so the reconciliation sweep has to look anyway.
		if (scheduleId === existing?.stripeScheduleId && !options.forceRefresh) return undefined;

		const upcoming = await this.stripeService.getScheduledQuantity(scheduleId);
		if (!upcoming) return null;

		return { stripeScheduleId: scheduleId, ...upcoming };
	}

	private async findBySchedule(
		schedule: Stripe.SubscriptionSchedule,
	): Promise<TUserAddonSubscription | undefined> {
		const subscription = schedule.subscription ?? schedule.released_subscription;
		const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;

		if (subscriptionId) {
			const bySubscription =
				await this.addonSubscriptionRepository.findByStripeSubscriptionId(subscriptionId);
			if (bySubscription) return bySubscription;
		}

		return this.addonSubscriptionRepository.findByStripeScheduleId(schedule.id);
	}

	private isStale(existing: TUserAddonSubscription | undefined, eventCreatedAt: Date): boolean {
		if (!existing?.lastStripeEventAt) return false;
		return eventCreatedAt.getTime() < existing.lastStripeEventAt.getTime();
	}
}

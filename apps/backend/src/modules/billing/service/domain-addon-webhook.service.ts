import { inject, injectable } from 'tsyringe';
import type Stripe from 'stripe';
import { Logger } from '@/core/logging';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { type TUserAddonSubscription } from '../domain/entities/user-addon-subscription.entity';
import { AddonSubscriptionStatusTransitionService } from './addon-subscription-status-transition.service';
import { ApplyPendingAddonQuantityUseCase } from '../useCase/apply-pending-addon-quantity.use-case';

/** Clock skew tolerance when deciding whether the billing period rolled over. */
const PERIOD_ROLL_TOLERANCE_MS = 60_000;

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
		@inject(ApplyPendingAddonQuantityUseCase)
		private readonly applyPendingAddonQuantityUseCase: ApplyPendingAddonQuantityUseCase,
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
		context: { eventCreatedAt: Date; period: { periodStart: Date; periodEnd: Date } },
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
		const stripeQuantity = subscription.items?.data?.[0]?.quantity ?? 1;
		const priceId = subscription.items?.data?.[0]?.price?.id ?? existing?.stripePriceId ?? '';
		const customerId =
			typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

		const periodRolled =
			!!existing &&
			periodStart.getTime() > existing.currentPeriodStart.getTime() + PERIOD_ROLL_TOLERANCE_MS;
		const hasPending = existing?.pendingQuantity != null;

		// A reduction is written to Stripe straight away but only takes effect at period end, so
		// while it is pending Stripe reports a lower quantity than the customer is entitled to.
		// An increase (quantity at or above what we hold) always wins and cancels the reduction.
		const currentQuantity = existing?.quantity ?? 0;
		const deferQuantity = hasPending && !periodRolled && stripeQuantity < currentQuantity;
		const quantity = deferQuantity ? currentQuantity : stripeQuantity;

		const previousStatus = existing?.status ?? '';
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
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			lastStripeEventAt: context.eventCreatedAt,
		});

		if (hasPending) {
			if (periodRolled) {
				// Stripe's quantity is authoritative now that the period is over.
				await this.applyPendingAddonQuantityUseCase.execute(row, { quantity: stripeQuantity });
			} else if (deferQuantity) {
				await this.addonSubscriptionRepository.schedulePendingQuantity(
					row,
					stripeQuantity,
					row.currentPeriodEnd,
				);
			} else {
				await this.addonSubscriptionRepository.clearPendingQuantity(row);
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

		if (subscription.cancel_at_period_end && !existing?.cancelAtPeriodEnd) {
			await this.transitionService.emitCancelInitiated(transitionInput);
		}
		if (!subscription.cancel_at_period_end && existing?.cancelAtPeriodEnd) {
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

		await this.addonSubscriptionRepository.update(existing, {
			status: 'canceled',
			cancelAtPeriodEnd: false,
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

	private isStale(existing: TUserAddonSubscription | undefined, eventCreatedAt: Date): boolean {
		if (!existing?.lastStripeEventAt) return false;
		return eventCreatedAt.getTime() < existing.lastStripeEventAt.getTime();
	}
}

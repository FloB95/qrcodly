import { inject, injectable } from 'tsyringe';
import Stripe from 'stripe';
import { Logger } from '@/core/logging';
import { KeyCache } from '@/core/cache';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { StripeService } from './stripe.service';
import { SubscriptionStatusTransitionService } from './subscription-status-transition.service';
import { DomainAddonWebhookService } from './domain-addon-webhook.service';
import { SyncAddonWithProUseCase } from '../useCase/sync-addon-with-pro.use-case';
import {
	DOMAIN_ADDON_PRODUCT,
	SUBSCRIPTION_PRODUCT_METADATA_KEY,
	SubscriptionProductResolver,
	type TSubscriptionProduct,
} from './subscription-product.resolver';

const WEBHOOK_EVENT_DEDUP_TTL = 86400; // 24 hours

@injectable()
export class StripeWebhookService {
	constructor(
		@inject(Logger) private readonly logger: Logger,
		@inject(UserSubscriptionRepository)
		private readonly userSubscriptionRepository: UserSubscriptionRepository,
		@inject(UserAddonSubscriptionRepository)
		private readonly addonSubscriptionRepository: UserAddonSubscriptionRepository,
		@inject(StripeService) private readonly stripeService: StripeService,
		@inject(SubscriptionStatusTransitionService)
		private readonly transitionService: SubscriptionStatusTransitionService,
		@inject(SubscriptionProductResolver)
		private readonly productResolver: SubscriptionProductResolver,
		@inject(DomainAddonWebhookService)
		private readonly domainAddonWebhookService: DomainAddonWebhookService,
		@inject(SyncAddonWithProUseCase)
		private readonly syncAddonWithProUseCase: SyncAddonWithProUseCase,
		@inject(KeyCache) private readonly cache: KeyCache,
	) {}

	async handleWebhookEvent(event: Stripe.Event): Promise<void> {
		this.logger.info('stripe.webhook.event', {
			stripe: { eventType: event.type, eventId: event.id },
		});

		// Deduplicate re-delivered Stripe events
		const dedupKey = `stripe_event:${event.id}`;
		const alreadyProcessed = await this.cache
			.getClient()
			.set(dedupKey, '1', 'EX', WEBHOOK_EVENT_DEDUP_TTL, 'NX');
		if (!alreadyProcessed) {
			this.logger.info('stripe.webhook.duplicate', {
				stripe: { eventId: event.id },
			});
			return;
		}

		try {
			switch (event.type) {
				case 'checkout.session.completed':
					await this.handleCheckoutCompleted(event.data.object, event);
					break;
				case 'customer.subscription.created':
					await this.handleSubscriptionCreated(event.data.object, event);
					break;
				case 'customer.subscription.updated':
					await this.handleSubscriptionUpdated(event.data.object, event);
					break;
				case 'customer.subscription.deleted':
					await this.handleSubscriptionDeleted(event.data.object);
					break;
				case 'invoice.payment_failed':
					await this.handlePaymentFailed(event.data.object);
					break;
				default:
					this.logger.info('stripe.webhook.unhandled', {
						stripe: { eventType: event.type },
					});
			}
		} catch (e) {
			const err = e instanceof Error ? e : new Error(String(e));
			this.logger.error('stripe.webhook.handler.error', {
				stripe: { eventType: event.type, eventId: event.id },
				error: { message: err.message, stack: err.stack, name: err.name },
			});
			throw err;
		}
	}

	/**
	 * Extract current period dates from a Stripe subscription.
	 * Since API version 2025-03 the period lives on the subscription items;
	 * webhook payloads may omit them, so we fall back to retrieving the full
	 * subscription via the API when they are missing.
	 */
	private async getSubscriptionPeriod(subscription: Stripe.Subscription): Promise<{
		periodStart: Date;
		periodEnd: Date;
	}> {
		let item = subscription.items?.data?.[0];

		if (!item?.current_period_start || !item?.current_period_end) {
			const full = await this.stripeService.getSubscription(subscription.id);
			item = full.items?.data?.[0];
		}

		return {
			periodStart: new Date((item?.current_period_start || 0) * 1000),
			periodEnd: new Date((item?.current_period_end || 0) * 1000),
		};
	}

	/**
	 * Resolves which product a subscription belongs to. Must run before any repository lookup:
	 * a not-found in `user_subscription` is otherwise indistinguishable between "add-on event"
	 * and "a genuine Pro record is missing".
	 */
	private async resolveProduct(
		subscription: Stripe.Subscription,
		declaredProduct?: string,
	): Promise<TSubscriptionProduct> {
		if (declaredProduct === DOMAIN_ADDON_PRODUCT) return 'domain_addon';
		return this.productResolver.resolveFromSubscription(subscription);
	}

	private async handleCheckoutCompleted(
		session: Stripe.Checkout.Session,
		event: Stripe.Event,
	): Promise<void> {
		const userId = session.metadata?.clerkUserId;
		if (!userId || !session.subscription) {
			this.logger.warn('stripe.webhook.checkout.missingData', {
				stripe: { sessionId: session.id },
			});
			return;
		}

		const subscriptionId =
			typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
		const subscription = await this.stripeService.getSubscription(subscriptionId);
		const period = await this.getSubscriptionPeriod(subscription);

		const product = await this.resolveProduct(
			subscription,
			session.metadata?.[SUBSCRIPTION_PRODUCT_METADATA_KEY],
		);

		if (product === 'domain_addon') {
			await this.domainAddonWebhookService.handleSubscriptionUpsert(subscription, {
				eventCreatedAt: new Date(event.created * 1000),
				period,
			});
			return;
		}

		if (product !== 'pro') {
			this.logger.warn('stripe.webhook.unknownProduct', {
				stripe: { subscriptionId, sessionId: session.id },
			});
			return;
		}

		const priceId = subscription.items.data[0]?.price.id ?? '';
		const customerId =
			typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
		const { periodStart, periodEnd } = period;

		await this.userSubscriptionRepository.upsertByStripeSubscriptionId({
			id: this.userSubscriptionRepository.generateId(),
			userId,
			stripeCustomerId: customerId,
			stripeSubscriptionId: subscriptionId,
			stripePriceId: priceId,
			status: subscription.status,
			currentPeriodStart: periodStart,
			currentPeriodEnd: periodEnd,
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			updatedAt: new Date(),
		});

		await this.transitionService.emitActive({
			userId,
			stripeSubscriptionId: subscriptionId,
			stripePriceId: priceId,
			currentPeriodEnd: periodEnd,
		});

		this.logger.info('stripe.webhook.checkout.completed', {
			stripe: { userId, subscriptionId },
		});
	}

	/**
	 * Only the add-on reacts to `created`. The Pro record is written by
	 * `checkout.session.completed`, which is the event that carries the Clerk user id — routing
	 * Pro here as well would warn on every new subscription because the row does not exist yet.
	 */
	private async handleSubscriptionCreated(
		subscription: Stripe.Subscription,
		event: Stripe.Event,
	): Promise<void> {
		const product = await this.resolveProduct(subscription);
		if (product !== 'domain_addon') {
			this.logger.info('stripe.webhook.subscription.createdIgnored', {
				stripe: { subscriptionId: subscription.id, product },
			});
			return;
		}

		await this.domainAddonWebhookService.handleSubscriptionUpsert(subscription, {
			eventCreatedAt: new Date(event.created * 1000),
			period: await this.getSubscriptionPeriod(subscription),
		});
	}

	private async handleSubscriptionUpdated(
		subscription: Stripe.Subscription,
		event: Stripe.Event,
	): Promise<void> {
		const product = await this.resolveProduct(subscription);
		const period = await this.getSubscriptionPeriod(subscription);

		if (product === 'domain_addon') {
			await this.domainAddonWebhookService.handleSubscriptionUpsert(subscription, {
				eventCreatedAt: new Date(event.created * 1000),
				period,
			});
			return;
		}

		if (product !== 'pro') {
			this.logger.warn('stripe.webhook.unknownProduct', {
				stripe: { subscriptionId: subscription.id },
			});
			return;
		}

		const existing = await this.userSubscriptionRepository.findByStripeSubscriptionId(
			subscription.id,
		);
		if (!existing) {
			this.logger.warn('stripe.webhook.subscription.notFound', {
				stripe: { subscriptionId: subscription.id },
			});
			return;
		}

		const previousStatus = existing.status;
		const customerId =
			typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
		const priceId = subscription.items.data[0]?.price.id ?? existing.stripePriceId;
		const { periodStart, periodEnd } = period;

		await this.userSubscriptionRepository.upsertByStripeSubscriptionId({
			id: existing.id,
			userId: existing.userId,
			stripeCustomerId: customerId,
			stripeSubscriptionId: subscription.id,
			stripePriceId: priceId,
			status: subscription.status,
			currentPeriodStart: periodStart,
			currentPeriodEnd: periodEnd,
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			updatedAt: new Date(),
		});

		await this.transitionService.handleTransition({
			userId: existing.userId,
			previousStatus,
			newStatus: subscription.status,
			stripeSubscriptionId: subscription.id,
			stripePriceId: priceId,
			currentPeriodEnd: periodEnd,
		});

		// Detect cancelAtPeriodEnd flipping to true (user initiated cancellation)
		if (subscription.cancel_at_period_end && !existing.cancelAtPeriodEnd) {
			await this.transitionService.emitCancelInitiated({
				userId: existing.userId,
				stripeSubscriptionId: subscription.id,
				stripePriceId: priceId,
				currentPeriodEnd: periodEnd,
			});
		}

		// Detect cancelAtPeriodEnd flipping to false (user un-canceled)
		if (!subscription.cancel_at_period_end && existing.cancelAtPeriodEnd) {
			await this.userSubscriptionRepository.clearCancellationNotifications(existing.userId);
			await this.syncAddonWithProUseCase.resume(existing.userId);
		}

		this.logger.info('stripe.webhook.subscription.updated', {
			stripe: {
				userId: existing.userId,
				subscriptionId: subscription.id,
				previousStatus,
				newStatus: subscription.status,
			},
		});
	}

	private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
		const product = await this.resolveProduct(subscription);
		const period = await this.getSubscriptionPeriod(subscription);

		if (product === 'domain_addon') {
			await this.domainAddonWebhookService.handleSubscriptionDeleted(subscription, { period });
			return;
		}

		const existing = await this.userSubscriptionRepository.findByStripeSubscriptionId(
			subscription.id,
		);
		if (!existing) {
			this.logger.warn('stripe.webhook.subscription.deleteNotFound', {
				stripe: { subscriptionId: subscription.id, product },
			});
			return;
		}

		const { periodEnd } = period;

		await this.userSubscriptionRepository.update(existing, {
			status: 'canceled',
			cancelAtPeriodEnd: false,
			updatedAt: new Date(),
		});

		await this.transitionService.emitCanceled({
			userId: existing.userId,
			stripeSubscriptionId: subscription.id,
			stripePriceId: existing.stripePriceId,
			currentPeriodEnd: periodEnd,
		});

		this.logger.info('stripe.webhook.subscription.deleted', {
			stripe: { userId: existing.userId, subscriptionId: subscription.id },
		});
	}

	private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
		const subscriptionRef = invoice.parent?.subscription_details?.subscription;
		const subscriptionId =
			typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;

		if (!subscriptionId) {
			return;
		}

		const existing =
			await this.userSubscriptionRepository.findByStripeSubscriptionId(subscriptionId);
		if (!existing) {
			// Could be the add-on. Mis-routing here would send the Pro dunning email for a
			// declined add-on charge, which is worse than staying silent.
			const addon =
				await this.addonSubscriptionRepository.findByStripeSubscriptionId(subscriptionId);
			if (addon) {
				await this.domainAddonWebhookService.handlePaymentFailed(addon);
			}
			return;
		}

		await this.transitionService.emitPastDue({
			userId: existing.userId,
			stripeSubscriptionId: subscriptionId,
			stripePriceId: existing.stripePriceId,
			currentPeriodEnd: existing.currentPeriodEnd,
		});

		this.logger.info('stripe.webhook.invoice.paymentFailed', {
			stripe: { userId: existing.userId, subscriptionId },
		});
	}
}

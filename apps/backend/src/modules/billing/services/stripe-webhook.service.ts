import { inject, injectable } from 'tsyringe';
import Stripe from 'stripe';
import { Logger } from '@/core/logging';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import { StripeService } from './stripe.service';
import { SubscriptionStatusTransitionService } from './subscription-status-transition.service';

@injectable()
export class StripeWebhookService {
	constructor(
		@inject(Logger) private readonly logger: Logger,
		@inject(UserSubscriptionRepository)
		private readonly userSubscriptionRepository: UserSubscriptionRepository,
		@inject(StripeService) private readonly stripeService: StripeService,
		@inject(SubscriptionStatusTransitionService)
		private readonly transitionService: SubscriptionStatusTransitionService,
	) {}

	async handleWebhookEvent(event: Stripe.Event): Promise<void> {
		this.logger.info('stripe.webhook.event', {
			stripe: { eventType: event.type, eventId: event.id },
		});

		try {
			switch (event.type) {
				case 'checkout.session.completed':
					await this.handleCheckoutCompleted(event.data.object);
					break;
				case 'customer.subscription.updated':
					await this.handleSubscriptionUpdated(event.data.object);
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
	 * Webhook payloads may omit `current_period_start/end` depending on
	 * the API version configured in the Stripe dashboard, so we fall back
	 * to retrieving the full subscription via the API when they are missing.
	 */
	private async getSubscriptionPeriod(subscription: Stripe.Subscription): Promise<{
		periodStart: Date;
		periodEnd: Date;
	}> {
		let start = subscription.current_period_start;
		let end = subscription.current_period_end;

		if (!start || !end) {
			const full = await this.stripeService.getSubscription(subscription.id);
			start = full.current_period_start;
			end = full.current_period_end;
		}

		return {
			periodStart: new Date((start || 0) * 1000),
			periodEnd: new Date((end || 0) * 1000),
		};
	}

	private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
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
		const priceId = subscription.items.data[0]?.price.id ?? '';
		const customerId =
			typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
		const { periodStart, periodEnd } = await this.getSubscriptionPeriod(subscription);

		await this.userSubscriptionRepository.upsertByStripeSubscriptionId({
			id: crypto.randomUUID(),
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

	private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
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
		const { periodStart, periodEnd } = await this.getSubscriptionPeriod(subscription);

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
		const existing = await this.userSubscriptionRepository.findByStripeSubscriptionId(
			subscription.id,
		);
		if (!existing) {
			this.logger.warn('stripe.webhook.subscription.deleteNotFound', {
				stripe: { subscriptionId: subscription.id },
			});
			return;
		}

		const { periodEnd } = await this.getSubscriptionPeriod(subscription);

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
		const subscriptionId =
			typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

		if (!subscriptionId) {
			return;
		}

		const existing =
			await this.userSubscriptionRepository.findByStripeSubscriptionId(subscriptionId);
		if (!existing) {
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

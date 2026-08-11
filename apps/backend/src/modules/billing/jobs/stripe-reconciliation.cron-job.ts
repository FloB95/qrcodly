import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { StripeService } from '../service/stripe.service';
import { SubscriptionStatusTransitionService } from '../service/subscription-status-transition.service';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { DomainAddonWebhookService } from '../service/domain-addon-webhook.service';
import { isAddonDomainPriceId, isProPriceId } from '../config/stripe-prices';
import { env } from '@/core/config/env';
import type Stripe from 'stripe';

/** Statuses under which an add-on still grants or is about to grant slots. */
const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'incomplete']);

/**
 * The add-on subscription that currently matters for a customer.
 *
 * A customer accumulates one subscription per purchase, so history piles up. A live one always
 * wins; otherwise the newest is taken so a cancellation is still mirrored rather than ignored.
 */
function pickAddonSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
	const addons = subscriptions.filter((sub) => isAddonDomainPriceId(sub.items.data[0]?.price.id));
	if (addons.length === 0) return null;

	const live = addons.filter((sub) => LIVE_STATUSES.has(sub.status));
	const candidates = live.length > 0 ? live : addons;

	return candidates.reduce((newest, sub) => (sub.created > newest.created ? sub : newest));
}

/**
 * Reconciliation job that syncs local subscription data with Stripe.
 *
 * Runs on `CRON_STRIPE_RECONCILIATION` (nightly by default) and performs two checks:
 * 1. Verifies all non-canceled local subscriptions against Stripe (fixes drift)
 * 2. Lists all active Stripe subscriptions and creates missing local records (fills gaps)
 */
@injectable()
@CronJob()
export class StripeReconciliationCronJob extends AbstractCronJob {
	// Nightly by default; staging overrides it to watch a lifecycle in one sitting.
	schedule = env.CRON_STRIPE_RECONCILIATION;

	protected async execute(): Promise<void> {
		const stripeService = container.resolve(StripeService);
		const repository = container.resolve(UserSubscriptionRepository);
		const transitionService = container.resolve(SubscriptionStatusTransitionService);

		let reconciled = 0;
		let created = 0;
		let errors = 0;

		// --- Part 1: Verify existing local subscriptions against Stripe ---
		const localSubscriptions = await repository.findAllNonCanceled();

		for (const local of localSubscriptions) {
			try {
				const stripe = await stripeService.getSubscription(local.stripeSubscriptionId);
				const stripeItem = stripe.items.data[0];
				const priceId = stripeItem?.price.id ?? local.stripePriceId;

				const periodStart = stripeItem?.current_period_start;
				const periodEnd = stripeItem?.current_period_end;
				if (!periodStart || !periodEnd) {
					this.logger.warn('stripe.reconciliation.missingPeriod', {
						stripe: { subscriptionId: local.stripeSubscriptionId, userId: local.userId },
					});
					continue;
				}

				const periodStartDate = new Date(periodStart * 1000);
				const periodEndDate = new Date(periodEnd * 1000);

				const needsUpdate =
					local.status !== stripe.status ||
					local.stripePriceId !== priceId ||
					local.cancelAtPeriodEnd !== stripe.cancel_at_period_end ||
					Math.abs(local.currentPeriodEnd.getTime() - periodEnd * 1000) > 60_000;

				if (needsUpdate) {
					await repository.update(local, {
						status: stripe.status,
						stripePriceId: priceId,
						currentPeriodStart: periodStartDate,
						currentPeriodEnd: periodEndDate,
						cancelAtPeriodEnd: stripe.cancel_at_period_end,
					});

					await transitionService.handleTransition({
						userId: local.userId,
						previousStatus: local.status,
						newStatus: stripe.status,
						stripeSubscriptionId: local.stripeSubscriptionId,
						stripePriceId: priceId,
						currentPeriodEnd: periodEndDate,
					});

					// Detect cancelAtPeriodEnd flip (mirrors webhook logic)
					if (stripe.cancel_at_period_end && !local.cancelAtPeriodEnd) {
						await transitionService.emitCancelInitiated({
							userId: local.userId,
							stripeSubscriptionId: local.stripeSubscriptionId,
							stripePriceId: priceId,
							currentPeriodEnd: periodEndDate,
						});
					}
					if (!stripe.cancel_at_period_end && local.cancelAtPeriodEnd) {
						await repository.clearCancellationNotifications(local.userId);
					}

					reconciled++;

					this.logger.info('stripe.reconciliation.updated', {
						stripe: {
							userId: local.userId,
							subscriptionId: local.stripeSubscriptionId,
							previousStatus: local.status,
							newStatus: stripe.status,
						},
					});
				}
			} catch (e) {
				const err = e instanceof Error ? e : new Error(String(e));
				errors++;
				this.logger.error('stripe.reconciliation.verifyError', {
					stripe: {
						subscriptionId: local.stripeSubscriptionId,
						userId: local.userId,
					},
					error: { message: err.message, name: err.name },
				});
			}
		}

		// --- Part 2: Find Stripe subscriptions missing from local DB ---
		// Listing every active subscription is the expensive part of this job, so it is fetched
		// once here and handed to the add-on pass below rather than swept twice.
		let stripeSubscriptions: Stripe.Subscription[] = [];
		try {
			stripeSubscriptions = await stripeService.listActiveSubscriptions();

			for (const sub of stripeSubscriptions) {
				try {
					const subItem = sub.items.data[0];
					const priceId = subItem?.price.id ?? '';

					// A customer can hold add-on subscriptions next to Pro. Adopting one here would
					// overwrite their Pro record and hand out Pro for the price of an add-on.
					if (!isProPriceId(priceId)) continue;

					const existing = await repository.findByStripeSubscriptionId(sub.id);
					if (existing) continue;

					const userId = sub.metadata?.clerkUserId;
					if (!userId) {
						this.logger.warn('stripe.reconciliation.missingUserId', {
							stripe: { subscriptionId: sub.id },
						});
						continue;
					}

					// If the user already has a non-canceled local record, skip.
					// If they have a canceled record, replace it with the new active one.
					const byUser = await repository.findByUserId(userId);
					if (byUser && byUser.status !== 'canceled') continue;

					const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

					const periodStart = subItem?.current_period_start;
					const periodEnd = subItem?.current_period_end;
					if (!periodStart || !periodEnd) {
						this.logger.warn('stripe.reconciliation.missingPeriod', {
							stripe: { subscriptionId: sub.id },
						});
						continue;
					}

					const periodStartDate = new Date(periodStart * 1000);
					const periodEndDate = new Date(periodEnd * 1000);
					const previousStatus = byUser?.status ?? '';

					if (byUser) {
						// Update the existing canceled record with the new subscription
						await repository.update(byUser, {
							stripeCustomerId: customerId,
							stripeSubscriptionId: sub.id,
							stripePriceId: priceId,
							status: sub.status,
							currentPeriodStart: periodStartDate,
							currentPeriodEnd: periodEndDate,
							cancelAtPeriodEnd: sub.cancel_at_period_end,
						});
					} else {
						await repository.upsertByStripeSubscriptionId({
							id: crypto.randomUUID(),
							userId,
							stripeCustomerId: customerId,
							stripeSubscriptionId: sub.id,
							stripePriceId: priceId,
							status: sub.status,
							currentPeriodStart: periodStartDate,
							currentPeriodEnd: periodEndDate,
							cancelAtPeriodEnd: sub.cancel_at_period_end,
							updatedAt: new Date(),
						});
					}

					await transitionService.handleTransition({
						userId,
						previousStatus,
						newStatus: sub.status,
						stripeSubscriptionId: sub.id,
						stripePriceId: priceId,
						currentPeriodEnd: periodEndDate,
					});

					created++;

					this.logger.info('stripe.reconciliation.created', {
						stripe: { userId, subscriptionId: sub.id },
					});
				} catch (e) {
					const err = e instanceof Error ? e : new Error(String(e));
					errors++;
					this.logger.error('stripe.reconciliation.createError', {
						stripe: { subscriptionId: sub.id },
						error: { message: err.message, name: err.name },
					});
				}
			}
		} catch (e) {
			const err = e instanceof Error ? e : new Error(String(e));
			errors++;
			this.logger.error('stripe.reconciliation.listSubscriptionsError', {
				error: { message: err.message, name: err.name },
			});
		}

		this.logger.info('stripe.reconciliation.complete', {
			stripe: {
				totalVerified: localSubscriptions.length,
				reconciled,
				created,
				errors,
			},
		});

		await this.reconcileDomainAddons();
	}

	/**
	 * Safety net for the domain add-on when a webhook is lost.
	 *
	 * Without this a dropped `checkout.session.completed` would leave the customer paying Stripe
	 * for slots that never reached our database. Both passes feed Stripe's state through the same
	 * handler the webhook uses, so the quantity and the scheduled-reduction mirror cannot drift
	 * between the two paths.
	 *
	 * Runs inside the Pro job rather than as its own: it shares the expensive subscription listing,
	 * inherits the same distributed lock, and is guaranteed to see the repaired Pro state — which
	 * matters because add-on entitlement is zero without an active Pro plan.
	 */
	private async reconcileDomainAddons(): Promise<void> {
		const stripeService = container.resolve(StripeService);
		const addonRepository = container.resolve(UserAddonSubscriptionRepository);
		const subscriptionRepository = container.resolve(UserSubscriptionRepository);
		const addonWebhookService = container.resolve(DomainAddonWebhookService);

		let repaired = 0;
		let adopted = 0;
		let errors = 0;

		// Every customer we could possibly hold an add-on for. Pro subscribers are the only ones
		// allowed to buy one, and existing add-on rows cover users whose Pro has since lapsed.
		const customers = new Map<string, string>();
		for (const pro of await subscriptionRepository.findAllNonCanceled()) {
			if (pro.stripeCustomerId) customers.set(pro.stripeCustomerId, pro.userId);
		}
		for (const addon of await addonRepository.findAllForReconciliation()) {
			if (addon.stripeCustomerId) customers.set(addon.stripeCustomerId, addon.userId);
		}

		for (const [customerId, knownUserId] of customers) {
			try {
				const subscriptions = await stripeService.listSubscriptionsForCustomer(customerId);
				const addonSubscription = pickAddonSubscription(subscriptions);
				if (!addonSubscription) continue;

				const item = addonSubscription.items.data[0];
				if (!item?.current_period_start || !item?.current_period_end) {
					this.logger.warn('stripe.reconciliation.addon.missingPeriod', {
						stripe: { subscriptionId: addonSubscription.id },
					});
					continue;
				}

				const known = await addonRepository.findByStripeSubscriptionId(addonSubscription.id);

				// The webhook stamps `clerkUserId` onto the subscription, but a subscription created
				// straight in the Stripe dashboard has no metadata. Fall back to the customer we
				// already resolved, otherwise those can never be adopted.
				const subscriptionWithUser = addonSubscription.metadata?.clerkUserId
					? addonSubscription
					: ({
							...addonSubscription,
							metadata: { ...addonSubscription.metadata, clerkUserId: knownUserId },
						} as Stripe.Subscription);

				await addonWebhookService.handleSubscriptionUpsert(subscriptionWithUser, {
					// Reconciliation reads the current truth, so it always wins over queued webhooks.
					eventCreatedAt: new Date(),
					period: {
						periodStart: new Date(item.current_period_start * 1000),
						periodEnd: new Date(item.current_period_end * 1000),
					},
					// Phases can be rewritten in place, so a lost `subscription_schedule.updated` is
					// only ever repaired here.
					forceScheduleRefresh: true,
				});

				if (known) {
					repaired++;
				} else {
					adopted++;
					// Warn, not info: reaching this means a webhook was lost and a paying customer was
					// without their slots until this run.
					this.logger.warn('stripe.reconciliation.addon.adopted', {
						stripe: {
							subscriptionId: addonSubscription.id,
							userId: subscriptionWithUser.metadata?.clerkUserId,
							quantity: item.quantity,
						},
					});
				}
			} catch (e) {
				const err = e instanceof Error ? e : new Error(String(e));
				errors++;
				this.logger.error('stripe.reconciliation.addon.verifyError', {
					stripe: { customerId, userId: knownUserId },
					error: { message: err.message, name: err.name },
				});
			}
		}

		this.logger.info('stripe.reconciliation.addon.complete', {
			stripe: { repaired, adopted, errors },
		});
	}
}

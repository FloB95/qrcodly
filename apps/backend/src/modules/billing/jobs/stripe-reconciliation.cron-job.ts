import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { StripeService } from '../services/stripe.service';
import { SubscriptionStatusTransitionService } from '../services/subscription-status-transition.service';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';

/**
 * Reconciliation job that syncs local subscription data with Stripe.
 *
 * Runs daily at 4:00 AM and performs two checks:
 * 1. Verifies all non-canceled local subscriptions against Stripe (fixes drift)
 * 2. Lists all active Stripe subscriptions and creates missing local records (fills gaps)
 */
@injectable()
@CronJob()
export class StripeReconciliationCronJob extends AbstractCronJob {
	// Run every day at 4:00 AM
	schedule = '0 4 * * *';

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
				const priceId = stripe.items.data[0]?.price.id ?? local.stripePriceId;

				let periodStart = stripe.current_period_start;
				let periodEnd = stripe.current_period_end;
				if (!periodStart || !periodEnd) {
					const full = await stripeService.getSubscription(stripe.id);
					periodStart = full.current_period_start;
					periodEnd = full.current_period_end;
				}
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
		try {
			const stripeSubscriptions = await stripeService.listActiveSubscriptions();

			for (const sub of stripeSubscriptions) {
				try {
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

					const priceId = sub.items.data[0]?.price.id ?? '';
					const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

					let periodStart = sub.current_period_start;
					let periodEnd = sub.current_period_end;
					if (!periodStart || !periodEnd) {
						const full = await stripeService.getSubscription(sub.id);
						periodStart = full.current_period_start;
						periodEnd = full.current_period_end;
					}
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
	}
}

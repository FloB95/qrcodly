import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { createClerkClient } from '@clerk/fastify';
import { env } from '@/core/config/env';
import { CANCELLATION_REMINDER_DAYS_BEFORE, GRACE_PERIOD_DAYS } from '@/core/config/constants';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { EnforceCustomDomainLimitUseCase } from '../useCase/enforce-custom-domain-limit.use-case';
import { CustomDomainEntitlementService } from '@/core/services/custom-domain-entitlement.service';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import { Mailer } from '@/core/mailer/mailer';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	weekday: 'long',
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	timeZone: 'UTC',
};

/**
 * Cron job to send reminder emails to users whose subscriptions are ending soon.
 * Runs daily at 2:00 AM and notifies users whose subscription period ends within
 * CANCELLATION_REMINDER_DAYS_BEFORE days and who haven't been reminded yet.
 */
@injectable()
@CronJob()
export class CancellationReminderCronJob extends AbstractCronJob {
	// Run every day at 2:00 AM
	schedule = env.CRON_CANCELLATION_REMINDER;

	protected async execute(): Promise<void> {
		await this.sendProReminders();
		await this.sendAddonReminders();
		await this.sendAddonReductionReminders();
	}

	private async sendProReminders(): Promise<void> {
		const repository = container.resolve(UserSubscriptionRepository);
		const mailer = container.resolve(Mailer);
		const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

		const subscriptions = await repository.findPendingCancellationReminders(
			CANCELLATION_REMINDER_DAYS_BEFORE,
		);

		if (subscriptions.length === 0) {
			this.logger.debug('No cancellation reminders to send');
			return;
		}

		this.logger.info(`Sending ${subscriptions.length} cancellation reminder(s)`);

		for (const subscription of subscriptions) {
			try {
				const user = await clerkClient.users.getUser(subscription.userId);
				const email = user.emailAddresses[0]?.emailAddress;
				const firstName = user.firstName;

				if (!email) {
					this.logger.warn('subscription.cancellationReminder.noEmail', {
						subscription: { userId: subscription.userId },
					});
					continue;
				}

				const gracePeriodEndDate = new Date(subscription.currentPeriodEnd);
				gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + GRACE_PERIOD_DAYS);

				const dateFormatOptions: Intl.DateTimeFormatOptions = {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					timeZone: 'UTC',
				};

				const template = await mailer.getTemplate('subscription-cancellation-reminder');
				const html = template({
					firstName: firstName || 'there',
					periodEndDate: subscription.currentPeriodEnd.toLocaleDateString(
						'en-US',
						dateFormatOptions,
					),
					gracePeriodDays: GRACE_PERIOD_DAYS,
					gracePeriodEndDate: gracePeriodEndDate.toLocaleDateString('en-US', dateFormatOptions),
					subscribeUrl: `${env.FRONTEND_URL}/plans`,
					logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
					year: new Date().getFullYear(),
				});

				await mailer.sendMail({
					to: email,
					subject: 'Reminder: Your QRcodly Subscription Is Ending Soon',
					html,
					template: 'subscription-cancellation-reminder',
				});

				await repository.markCancellationReminderSent(subscription.userId);

				this.logger.info('subscription.cancellationReminderSent', {
					subscription: {
						userId: subscription.userId,
						periodEndDate: subscription.currentPeriodEnd.toISOString(),
					},
				});
			} catch (error) {
				this.logger.error('subscription.cancellationReminderFailed', {
					subscription: { userId: subscription.userId },
					error: error as Error,
				});
			}
		}
	}

	private async sendAddonReminders(): Promise<void> {
		const addonSubscriptionRepository = container.resolve(UserAddonSubscriptionRepository);
		const entitlementService = container.resolve(CustomDomainEntitlementService);
		const enforceCustomDomainLimitUseCase = container.resolve(EnforceCustomDomainLimitUseCase);
		const clerkUserInfoService = container.resolve(ClerkUserInfoService);
		const mailer = container.resolve(Mailer);

		const addons = await addonSubscriptionRepository.findPendingCancellationReminders(
			CANCELLATION_REMINDER_DAYS_BEFORE,
		);

		if (addons.length === 0) {
			this.logger.debug('No add-on cancellation reminders to send');
			return;
		}

		this.logger.info(`Sending ${addons.length} add-on cancellation reminder(s)`);

		for (const addon of addons) {
			try {
				const { email, firstName } = await clerkUserInfoService.getUserInfo(addon.userId);
				if (!email) {
					this.logger.warn('domainAddon.cancellationReminder.noEmail', {
						subscription: { userId: addon.userId },
					});
					continue;
				}

				// Project the state after the slots lapse so the reminder names the same domains the
				// enforcement will actually switch off.
				const { baseLimit } = await entitlementService.getCustomDomainLimit(addon.userId);
				const { disabled } = await enforceCustomDomainLimitUseCase.execute(addon.userId, {
					dryRun: true,
					overrideLimit: baseLimit,
				});

				const gracePeriodEndDate = new Date(addon.currentPeriodEnd);
				gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + GRACE_PERIOD_DAYS);

				const template = await mailer.getTemplate('domain-addon-cancel-initiated');
				const html = template({
					firstName: firstName || 'there',
					periodEndDate: addon.currentPeriodEnd.toLocaleDateString('en-US', DATE_FORMAT),
					gracePeriodEndDate: gracePeriodEndDate.toLocaleDateString('en-US', DATE_FORMAT),
					affectedDomains: disabled,
					hasAffectedDomains: disabled.length > 0,
					domainsUrl: `${env.FRONTEND_URL}/dashboard/settings/domains`,
					logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
					year: new Date().getFullYear(),
				});

				await mailer.sendMail({
					to: email,
					subject: 'Reminder: Your QRcodly Extra Domains Are Ending Soon',
					html,
					template: 'domain-addon-cancel-initiated',
				});

				await addonSubscriptionRepository.markCancellationReminderSent(addon);

				this.logger.info('domainAddon.cancellationReminderSent', {
					subscription: { userId: addon.userId },
				});
			} catch (error) {
				this.logger.error('domainAddon.cancellationReminderFailed', {
					subscription: { userId: addon.userId },
					error: error as Error,
				});
			}
		}
	}

	/**
	 * Last call before a parked reduction takes effect.
	 *
	 * The domains are re-projected rather than taken from the announcement sent at scheduling
	 * time: the user keeps every paid slot until the date, so anything added since then can have
	 * changed which domains lose out.
	 */
	private async sendAddonReductionReminders(): Promise<void> {
		const addonSubscriptionRepository = container.resolve(UserAddonSubscriptionRepository);
		const entitlementService = container.resolve(CustomDomainEntitlementService);
		const enforceCustomDomainLimitUseCase = container.resolve(EnforceCustomDomainLimitUseCase);
		const clerkUserInfoService = container.resolve(ClerkUserInfoService);
		const mailer = container.resolve(Mailer);

		const addons = await addonSubscriptionRepository.findPendingReductionReminders(
			CANCELLATION_REMINDER_DAYS_BEFORE,
		);

		if (addons.length === 0) {
			this.logger.debug('No add-on reduction reminders to send');
			return;
		}

		this.logger.info(`Sending ${addons.length} add-on reduction reminder(s)`);

		for (const addon of addons) {
			try {
				const { scheduledQuantity, scheduledQuantityEffectiveAt } = addon;
				if (scheduledQuantity === null || scheduledQuantityEffectiveAt === null) continue;

				const { email, firstName } = await clerkUserInfoService.getUserInfo(addon.userId);
				if (!email) {
					this.logger.warn('domainAddon.reductionReminder.noEmail', {
						subscription: { userId: addon.userId },
					});
					continue;
				}

				const { baseLimit } = await entitlementService.getCustomDomainLimit(addon.userId);
				const { disabled } = await enforceCustomDomainLimitUseCase.execute(addon.userId, {
					dryRun: true,
					overrideLimit: baseLimit + scheduledQuantity,
				});

				const template = await mailer.getTemplate('domain-addon-reduction-scheduled');
				const html = template({
					firstName: firstName || 'there',
					effectiveDate: scheduledQuantityEffectiveAt.toLocaleDateString('en-US', DATE_FORMAT),
					currentQuantity: addon.quantity,
					scheduledQuantity,
					isCurrentSingular: addon.quantity === 1,
					isScheduledSingular: scheduledQuantity === 1,
					affectedDomains: disabled,
					hasAffectedDomains: disabled.length > 0,
					domainsUrl: `${env.FRONTEND_URL}/dashboard/settings/domains`,
					logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
					year: new Date().getFullYear(),
				});

				await mailer.sendMail({
					to: email,
					subject: 'Reminder: Your QRcodly Extra Domains Change Soon',
					html,
					template: 'domain-addon-reduction-scheduled',
				});

				await addonSubscriptionRepository.markCancellationReminderSent(addon);

				this.logger.info('domainAddon.reductionReminderSent', {
					subscription: { userId: addon.userId, scheduledQuantity },
				});
			} catch (error) {
				this.logger.error('domainAddon.reductionReminderFailed', {
					subscription: { userId: addon.userId },
					error: error as Error,
				});
			}
		}
	}
}

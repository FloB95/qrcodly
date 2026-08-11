import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { createClerkClient } from '@clerk/fastify';
import { env } from '@/core/config/env';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { DisableProFeaturesUseCase } from '../useCase/disable-pro-features.use-case';
import { EnforceCustomDomainLimitUseCase } from '../useCase/enforce-custom-domain-limit.use-case';
import { SyncAddonWithProUseCase } from '../useCase/sync-addon-with-pro.use-case';
import { Mailer } from '@/core/mailer/mailer';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';

/**
 * Cron job to process expired subscription grace periods.
 * Runs daily at 3:00 AM to check for expired grace periods and disable custom domains.
 */
@injectable()
@CronJob()
export class ProcessExpiredGracePeriodsCronJob extends AbstractCronJob {
	// Run every day at 3:00 AM
	schedule = env.CRON_GRACE_PERIODS;

	protected async execute(): Promise<void> {
		await this.processExpiredProGracePeriods();
		await this.processExpiredAddonGracePeriods();
	}

	private async processExpiredProGracePeriods(): Promise<void> {
		const userSubscriptionRepository = container.resolve(UserSubscriptionRepository);
		const disableProFeaturesUseCase = container.resolve(DisableProFeaturesUseCase);
		const mailer = container.resolve(Mailer);
		const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

		// Find all expired and unprocessed grace periods
		const expiredSubscriptions =
			await userSubscriptionRepository.findExpiredUnprocessedGracePeriods();

		if (expiredSubscriptions.length === 0) {
			this.logger.debug('No expired grace periods to process');
			return;
		}

		this.logger.info(`Processing ${expiredSubscriptions.length} expired grace periods`);

		for (const subscription of expiredSubscriptions) {
			try {
				// Disable the user's Pro features (custom domains, analytics integrations)
				await disableProFeaturesUseCase.execute(subscription.userId);

				// Stop billing for extra domains the user can no longer use. Scheduled to the end of
				// the add-on's own paid period, never immediate — an immediate cancel would credit.
				await container.resolve(SyncAddonWithProUseCase).cancelAtPeriodEnd(subscription.userId);

				// Fetch user info from Clerk for email notification
				const user = await clerkClient.users.getUser(subscription.userId);
				const email = user.emailAddresses[0]?.emailAddress;
				const firstName = user.firstName;

				if (email) {
					// Send email notification about Pro features being disabled
					const template = await mailer.getTemplate('subscription-pro-features-disabled');
					const html = template({
						firstName,
						subscribeUrl: `${env.FRONTEND_URL}/plans`,
						logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
						year: new Date().getFullYear(),
					});

					await mailer.sendMail({
						to: email,
						subject: 'Your QRcodly Pro Features Have Been Disabled',
						html,
						template: 'subscription-pro-features-disabled',
					});
				}

				this.logger.info('subscription.gracePeriodExpired', {
					subscription: {
						userId: subscription.userId,
					},
				});
			} catch (error) {
				this.logger.error('subscription.gracePeriodProcessingFailed', {
					subscription: {
						userId: subscription.userId,
					},
					error: error as Error,
				});
			}
		}
	}

	/**
	 * Runs after the Pro sweep on purpose: losing Pro already drops the effective limit to zero,
	 * so doing it in this order means the add-on pass sees the final entitlement.
	 */
	private async processExpiredAddonGracePeriods(): Promise<void> {
		const addonSubscriptionRepository = container.resolve(UserAddonSubscriptionRepository);
		const enforceCustomDomainLimitUseCase = container.resolve(EnforceCustomDomainLimitUseCase);
		const clerkUserInfoService = container.resolve(ClerkUserInfoService);
		const mailer = container.resolve(Mailer);

		const expired = await addonSubscriptionRepository.findExpiredUnprocessedGracePeriods();
		if (expired.length === 0) {
			this.logger.debug('No expired add-on grace periods to process');
			return;
		}

		this.logger.info(`Processing ${expired.length} expired add-on grace periods`);

		for (const addon of expired) {
			try {
				const { disabled } = await enforceCustomDomainLimitUseCase.execute(addon.userId);
				await addonSubscriptionRepository.markAddonFeaturesDisabled(addon);

				const { email, firstName } = await clerkUserInfoService.getUserInfo(addon.userId);
				if (email) {
					const template = await mailer.getTemplate('domain-addon-features-disabled');
					const html = template({
						firstName: firstName || 'there',
						affectedDomains: disabled,
						hasAffectedDomains: disabled.length > 0,
						domainsUrl: `${env.FRONTEND_URL}/dashboard/settings/domains`,
						logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
						year: new Date().getFullYear(),
					});

					await mailer.sendMail({
						to: email,
						subject: 'Your QRcodly Extra Domains Have Been Disabled',
						html,
						template: 'domain-addon-features-disabled',
					});
				}

				this.logger.info('domainAddon.gracePeriodExpired', {
					subscription: { userId: addon.userId, disabled },
				});
			} catch (error) {
				this.logger.error('domainAddon.gracePeriodProcessingFailed', {
					subscription: { userId: addon.userId },
					error: error as Error,
				});
			}
		}
	}
}

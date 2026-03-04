import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { createClerkClient } from '@clerk/fastify';
import { env } from '@/core/config/env';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import { DisableProFeaturesUseCase } from '../useCase/disable-pro-features.use-case';
import { Mailer } from '@/core/mailer/mailer';

/**
 * Cron job to process expired subscription grace periods.
 * Runs daily at 3:00 AM to check for expired grace periods and disable custom domains.
 */
@injectable()
@CronJob()
export class ProcessExpiredGracePeriodsCronJob extends AbstractCronJob {
	// Run every day at 3:00 AM
	schedule = '0 3 * * *';

	protected async execute(): Promise<void> {
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
}

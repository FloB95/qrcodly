import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { createClerkClient } from '@clerk/fastify';
import { env } from '@/core/config/env';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import { DisableUserDomainsUseCase } from '../useCase/disable-user-domains.use-case';
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
		const disableUserDomainsUseCase = container.resolve(DisableUserDomainsUseCase);
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
				// Disable the user's custom domains
				await disableUserDomainsUseCase.execute(subscription.userId);

				// Fetch user info from Clerk for email notification
				const user = await clerkClient.users.getUser(subscription.userId);
				const email = user.emailAddresses[0]?.emailAddress;
				const firstName = user.firstName;

				if (email) {
					// Send email notification about domains being disabled
					const template = await mailer.getTemplate('subscription-domains-disabled');
					const html = template({
						firstName,
						subscribeUrl: `${env.FRONTEND_URL}/plans`,
						year: new Date().getFullYear(),
					});

					await mailer.sendMail({
						to: email,
						subject: 'Your QRcodly Custom Domains Have Been Disabled',
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

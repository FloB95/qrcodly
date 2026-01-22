import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import SubscriptionGracePeriodRepository from '../domain/repository/subscription-grace-period.repository';
import { DisableUserDomainsUseCase } from '../useCase/disable-user-domains.use-case';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';

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
		const gracePeriodRepository = container.resolve(SubscriptionGracePeriodRepository);
		const disableUserDomainsUseCase = container.resolve(DisableUserDomainsUseCase);
		const mailer = container.resolve(Mailer);

		// Find all expired and unprocessed grace periods
		const expiredGracePeriods = await gracePeriodRepository.findExpiredUnprocessed();

		if (expiredGracePeriods.length === 0) {
			this.logger.debug('No expired grace periods to process');
			return;
		}

		this.logger.info(`Processing ${expiredGracePeriods.length} expired grace periods`);

		for (const gracePeriod of expiredGracePeriods) {
			try {
				// Disable the user's custom domains
				await disableUserDomainsUseCase.execute(gracePeriod.userId, gracePeriod.id);

				// Send email notification about domains being disabled
				const template = await mailer.getTemplate('subscription-domains-disabled');
				const html = template({
					firstName: gracePeriod.firstName,
					subscribeUrl: `${env.FRONTEND_URL}/pricing`,
					year: new Date().getFullYear(),
				});

				await mailer.sendMail({
					to: gracePeriod.email,
					subject: 'Your QRcodly Custom Domains Have Been Disabled',
					html,
				});

				this.logger.info('subscription.gracePeriodExpired', {
					gracePeriod: {
						id: gracePeriod.id,
						userId: gracePeriod.userId,
					},
				});
			} catch (error) {
				this.logger.error('subscription.gracePeriodProcessingFailed', {
					gracePeriod: {
						id: gracePeriod.id,
						userId: gracePeriod.userId,
					},
					error: error as Error,
				});
			}
		}
	}
}

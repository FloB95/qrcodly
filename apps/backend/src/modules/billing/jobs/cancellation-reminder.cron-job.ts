import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { createClerkClient } from '@clerk/fastify';
import { env } from '@/core/config/env';
import { CANCELLATION_REMINDER_DAYS_BEFORE, GRACE_PERIOD_DAYS } from '@/core/config/constants';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import { Mailer } from '@/core/mailer/mailer';

/**
 * Cron job to send reminder emails to users whose subscriptions are ending soon.
 * Runs daily at 2:00 AM and notifies users whose subscription period ends within
 * CANCELLATION_REMINDER_DAYS_BEFORE days and who haven't been reminded yet.
 */
@injectable()
@CronJob()
export class CancellationReminderCronJob extends AbstractCronJob {
	// Run every day at 2:00 AM
	schedule = '* * * * *';

	protected async execute(): Promise<void> {
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
					year: new Date().getFullYear(),
				});

				await mailer.sendMail({
					to: email,
					subject: 'Reminder: Your QRcodly Subscription Is Ending Soon',
					html,
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
}

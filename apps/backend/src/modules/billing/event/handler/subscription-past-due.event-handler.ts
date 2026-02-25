import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { SubscriptionPastDueEvent } from '@/core/event/subscription-past-due.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';

@EventHandler(SubscriptionPastDueEvent.eventName)
export class SubscriptionPastDueEventHandler extends AbstractEventHandler<SubscriptionPastDueEvent> {
	constructor() {
		super();
	}

	async handle(event: SubscriptionPastDueEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const userSubscriptionRepository = container.resolve(UserSubscriptionRepository);
		const { userId, email, firstName } = event.data;

		if (!userId) {
			logger.error('error:subscription.pastDue.missingUserId', {
				subscription: {
					stripeSubscriptionId: event.data.stripeSubscriptionId,
				},
			});
			return;
		}

		logger.info('subscription.pastDue', {
			subscription: {
				userId,
				currentPeriodEnd: event.data.currentPeriodEnd,
			},
		});

		try {
			// Check idempotency — skip if already notified
			const subscription = await userSubscriptionRepository.findByUserId(userId);
			if (subscription?.pastDueNotifiedAt) {
				logger.info('subscription.pastDue.alreadyNotified', {
					subscription: { userId },
				});
				return;
			}

			const template = await mailer.getTemplate('subscription-past-due');
			const html = template({
				firstName: firstName || 'there',
				billingUrl: `${env.FRONTEND_URL}/dashboard/settings/billing`,
				year: new Date().getFullYear(),
			});

			await mailer.sendMail({
				to: email,
				subject: 'Action Required: Your QRcodly Payment is Past Due',
				html,
			});

			// Mark as notified after successful email send to allow retries on failure
			await userSubscriptionRepository.markPastDueNotified(userId);

			logger.info('subscription.pastDueEmailSent', {
				subscription: { userId, email },
			});
		} catch (error) {
			logger.error('subscription.pastDueEmailFailed', {
				subscription: { userId, email },
				error: error as Error,
			});
		}
	}
}

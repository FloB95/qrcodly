import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { SubscriptionCancelInitiatedEvent } from '@/core/event/subscription-cancel-initiated.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import { GRACE_PERIOD_DAYS } from '@/core/config/constants';
import UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';

@EventHandler(SubscriptionCancelInitiatedEvent.eventName)
export class SubscriptionCancelInitiatedEventHandler extends AbstractEventHandler<SubscriptionCancelInitiatedEvent> {
	constructor() {
		super();
	}

	async handle(event: SubscriptionCancelInitiatedEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const userSubscriptionRepository = container.resolve(UserSubscriptionRepository);
		const { userId, email, firstName, currentPeriodEnd } = event.data;

		if (!userId) {
			logger.error('error:subscription.cancelInitiated.missingUserId', {
				subscription: {
					stripeSubscriptionId: event.data.stripeSubscriptionId,
				},
			});
			return;
		}

		logger.info('subscription.cancelInitiated', {
			subscription: {
				userId,
				currentPeriodEnd,
			},
		});

		try {
			// Check idempotency — skip if already notified
			const subscription = await userSubscriptionRepository.findByUserId(userId);
			if (subscription?.cancellationNotifiedAt) {
				logger.info('subscription.cancelInitiated.alreadyNotified', {
					subscription: { userId },
				});
				return;
			}

			const gracePeriodEndDate = new Date(currentPeriodEnd);
			gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + GRACE_PERIOD_DAYS);

			const dateFormatOptions: Intl.DateTimeFormatOptions = {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				timeZone: 'UTC',
			};

			// Send email notification
			const template = await mailer.getTemplate('subscription-cancel-initiated');
			const html = template({
				firstName: firstName || 'there',
				periodEndDate: currentPeriodEnd.toLocaleDateString('en-US', dateFormatOptions),
				gracePeriodDays: GRACE_PERIOD_DAYS,
				gracePeriodEndDate: gracePeriodEndDate.toLocaleDateString('en-US', dateFormatOptions),
				subscribeUrl: `${env.FRONTEND_URL}/plans`,
				year: new Date().getFullYear(),
			});

			await mailer.sendMail({
				to: email,
				subject: "We're Sorry to See You Go - QRcodly Subscription",
				html,
			});

			// Mark as notified after successful email send to allow retries on failure
			await userSubscriptionRepository.markCancellationNotified(userId);

			logger.info('subscription.cancelInitiatedEmailSent', {
				subscription: {
					userId,
					email,
					periodEndDate: currentPeriodEnd.toISOString(),
				},
			});
		} catch (error) {
			logger.error('subscription.cancelInitiatedEmailFailed', {
				subscription: { userId, email },
				error: error as Error,
			});
		}
	}
}

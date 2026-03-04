import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { SubscriptionCanceledEvent } from '@/core/event/subscription-canceled.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { GRACE_PERIOD_DAYS } from '@/core/config/constants';
import UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';

@EventHandler(SubscriptionCanceledEvent.eventName)
export class SubscriptionCanceledEventHandler extends AbstractEventHandler<SubscriptionCanceledEvent> {
	constructor() {
		super();
	}

	async handle(event: SubscriptionCanceledEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const userSubscriptionRepository = container.resolve(UserSubscriptionRepository);
		const { userId } = event.data;

		if (!userId) {
			logger.error('error:subscription.canceled.missingUserId', {
				subscription: {
					stripeSubscriptionId: event.data.stripeSubscriptionId,
				},
			});
			return;
		}

		logger.info('subscription.canceled', {
			subscription: {
				userId,
				currentPeriodEnd: event.data.currentPeriodEnd,
			},
		});

		try {
			// Set grace period on the user subscription
			const subscription = await userSubscriptionRepository.findByUserId(userId);
			if (!subscription) {
				logger.error('error:subscription.canceled.notFound', {
					subscription: { userId },
				});
				return;
			}

			const gracePeriodEndsAt = new Date(event.data.currentPeriodEnd);
			gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS);

			await userSubscriptionRepository.update(subscription, { gracePeriodEndsAt });

			logger.info('subscription.gracePeriodSet', {
				subscription: {
					userId,
					gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
				},
			});
		} catch (error) {
			logger.error('subscription.canceledHandlerFailed', {
				subscription: { userId },
				error: error as Error,
			});
		}
	}
}

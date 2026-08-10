import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { DomainAddonCanceledEvent } from '@/core/event/domain-addon-canceled.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { GRACE_PERIOD_DAYS } from '@/core/config/constants';
import UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';

@EventHandler(DomainAddonCanceledEvent.eventName)
export class DomainAddonCanceledEventHandler extends AbstractEventHandler<DomainAddonCanceledEvent> {
	constructor() {
		super();
	}

	async handle(event: DomainAddonCanceledEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const addonSubscriptionRepository = container.resolve(UserAddonSubscriptionRepository);
		const { userId } = event.data;

		if (!userId) {
			logger.error('error:domainAddon.canceled.missingUserId', {
				subscription: { stripeSubscriptionId: event.data.stripeSubscriptionId },
			});
			return;
		}

		try {
			const addon = await addonSubscriptionRepository.findByUserAndType(userId, 'custom_domain');
			if (!addon) {
				logger.error('error:domainAddon.canceled.notFound', { subscription: { userId } });
				return;
			}

			const gracePeriodEndsAt = new Date(event.data.currentPeriodEnd);
			gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS);

			await addonSubscriptionRepository.update(addon, { gracePeriodEndsAt });

			logger.info('domainAddon.gracePeriodSet', {
				subscription: { userId, gracePeriodEndsAt: gracePeriodEndsAt.toISOString() },
			});
		} catch (error) {
			logger.error('domainAddon.canceledHandlerFailed', {
				subscription: { userId },
				error: error as Error,
			});
		}
	}
}

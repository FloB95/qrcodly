import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { DomainAddonActiveEvent } from '@/core/event/domain-addon-active.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';
import { EnforceCustomDomainLimitUseCase } from '../../useCase/enforce-custom-domain-limit.use-case';

@EventHandler(DomainAddonActiveEvent.eventName)
export class DomainAddonActiveEventHandler extends AbstractEventHandler<DomainAddonActiveEvent> {
	constructor() {
		super();
	}

	async handle(event: DomainAddonActiveEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const addonSubscriptionRepository = container.resolve(UserAddonSubscriptionRepository);
		const enforceCustomDomainLimitUseCase = container.resolve(EnforceCustomDomainLimitUseCase);
		const { userId, quantity } = event.data;

		if (!userId) {
			logger.error('error:domainAddon.active.missingUserId', {
				subscription: { stripeSubscriptionId: event.data.stripeSubscriptionId },
			});
			return;
		}

		logger.info('domainAddon.active', { subscription: { userId, quantity } });

		try {
			const addon = await addonSubscriptionRepository.findByUserAndType(userId, 'custom_domain');
			if (!addon) {
				logger.error('error:domainAddon.active.notFound', { subscription: { userId } });
				return;
			}

			// A re-purchase after a lapse lands on the same row, which still carries the grace
			// period and disabled marker from last time — those would keep the slots at zero.
			await addonSubscriptionRepository.clearGracePeriod(addon);

			const { enabled } = await enforceCustomDomainLimitUseCase.execute(userId);

			logger.info('domainAddon.slotsApplied', { subscription: { userId, quantity, enabled } });
		} catch (error) {
			logger.error('domainAddon.activeHandlerFailed', {
				subscription: { userId },
				error: error as Error,
			});
		}
	}
}

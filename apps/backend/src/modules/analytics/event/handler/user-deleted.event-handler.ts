import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { Logger } from '@/core/logging';
import AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';

@EventHandler(UserDeletedEvent.eventName)
export class DeleteAnalyticsIntegrationsOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		try {
			await container.resolve(AnalyticsIntegrationRepository).deleteAllByUserId(event.user.id);
		} catch (error) {
			container.resolve(Logger).error('analytics.integration.user-cleanup.failed', {
				error: error as Error,
				userId: event.user.id,
			});
		}
	}
}

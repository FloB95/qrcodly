import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { cleanUpAfterUser } from '@/core/utils/user-cleanup';
import IntegrationUsageRepository from '../../domain/repository/integration-usage.repository';

@EventHandler(UserDeletedEvent.eventName)
export class DeleteIntegrationUsageOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		await cleanUpAfterUser('integration-usage', event.user.id, () =>
			container.resolve(IntegrationUsageRepository).deleteByUserId(event.user.id),
		);
	}
}

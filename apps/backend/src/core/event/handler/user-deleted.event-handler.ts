import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { UserDeletedEvent } from '../user-deleted.event';
import { AbstractEventHandler } from './abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { sleep } from '@/utils/general';

@EventHandler(UserDeletedEvent.eventName)
export class UserCreatedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	/**
	 * Handles the event.
	 * @param {UserDeletedEvent} event The event to handle.
	 */
	async handle(event: UserDeletedEvent): Promise<void> {
		await sleep(100);
		const logger = container.resolve(Logger);
		logger.info('user.deleted', {
			id: event.user.id,
		});
	}
}

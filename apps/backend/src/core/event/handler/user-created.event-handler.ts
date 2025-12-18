import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { UserCreatedEvent } from '../user-created.event';
import { AbstractEventHandler } from './abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { sleep } from '@/utils/general';

@EventHandler(UserCreatedEvent.eventName)
export class QrCodeCreatedEventHandler extends AbstractEventHandler<UserCreatedEvent> {
	constructor() {
		super();
	}

	/**
	 * Handles the event.
	 * @param {UserCreatedEvent} event The event to handle.
	 */
	async handle(event: UserCreatedEvent): Promise<void> {
		await sleep(100);
		const logger = container.resolve(Logger);
		logger.info('new user registered', {
			id: event.user?.id,
			first_name: event.user?.first_name,
			last_name: event.user?.last_name,
		});
	}
}

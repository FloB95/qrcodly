import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { UserUpdatedEvent } from '../user-updated.event';
import { AbstractEventHandler } from './abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { sleep } from '@/utils/general';

@EventHandler(UserUpdatedEvent.eventName)
export class UserUpdatedEventHandler extends AbstractEventHandler<UserUpdatedEvent> {
	constructor() {
		super();
	}

	/**
	 * Handles the event.
	 * @param {UserUpdatedEvent} event The event to handle.
	 */
	async handle(event: UserUpdatedEvent): Promise<void> {
		await sleep(100);
		const logger = container.resolve(Logger);
		logger.info('user.updated', {
			id: event.user.id,
			first_name: event.user.first_name,
			last_name: event.user.last_name,
			email_addresses: event.user.email_addresses,
			image_url: event.user.image_url,
		});
	}
}

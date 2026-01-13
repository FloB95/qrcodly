import { AbstractEvent } from '@/core/event/abstract.event';
import type { UserJSON } from '@clerk/fastify';

type UserUpdatedEventData = UserJSON;

/**
 * Event triggered when a User is updated.
 */
export class UserUpdatedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'UserUpdated';

	constructor(public readonly user: UserUpdatedEventData) {
		super();
	}

	eventName(): string {
		return UserUpdatedEvent.eventName;
	}
}

import { AbstractEvent } from '@/core/event/abstract.event';
import type { UserJSON } from '@clerk/fastify';

type UserCreatedEventData = UserJSON;

/**
 * Event triggered when a User is created.
 */
export class UserCreatedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'UserCreated';

	constructor(public readonly user: UserCreatedEventData) {
		super();
	}

	eventName(): string {
		return UserCreatedEvent.eventName;
	}
}

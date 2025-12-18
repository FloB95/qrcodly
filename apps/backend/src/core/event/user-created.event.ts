import { AbstractEvent } from '@/core/event/abstract.event';

type UserCreatedEventData = {
	id: string;
	first_name: string;
	last_name: string;
};

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

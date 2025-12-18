import { AbstractEvent } from '@/core/event/abstract.event';

type UserDeletedEventData = {
	id: string;
};

/**
 * Event triggered when a User is deleted.
 */
export class UserDeletedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'UserDeleted';

	constructor(public readonly user: UserDeletedEventData) {
		super();
	}

	eventName(): string {
		return UserDeletedEvent.eventName;
	}
}

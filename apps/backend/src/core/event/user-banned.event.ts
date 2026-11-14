import { AbstractEvent } from '@/core/event/abstract.event';

type UserBannedEventData = {
	id: string;
};

/**
 * Event triggered when a User is banned by the app.
 */
export class UserBannedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'UserBanned';

	constructor(public readonly user: UserBannedEventData) {
		super();
	}

	eventName(): string {
		return UserBannedEvent.eventName;
	}
}

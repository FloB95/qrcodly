import { AbstractEvent } from '@/core/event/abstract.event';

type UserCleanupFailedEventData = {
	userId: string;
	/** The module step that failed, e.g. `qrCode` or `billing` */
	step: string;
	/** How many items of that step could not be deleted, when it deletes item by item */
	failedItems?: number;
	error: string;
};

/**
 * Emitted when removing a deleted user's data failed for good, after retries, so the data is
 * still there and someone has to look at it.
 */
export class UserCleanupFailedEvent extends AbstractEvent {
	static readonly eventName = 'UserCleanupFailed';

	constructor(public readonly data: UserCleanupFailedEventData) {
		super();
	}

	eventName(): string {
		return UserCleanupFailedEvent.eventName;
	}
}

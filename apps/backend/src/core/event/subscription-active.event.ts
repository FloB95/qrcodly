import { AbstractEvent } from '@/core/event/abstract.event';

export type SubscriptionActiveEventData = {
	userId: string;
	email: string;
	firstName?: string;
	subscriptionId?: string;
};

/**
 * Event triggered when a subscription becomes active.
 */
export class SubscriptionActiveEvent extends AbstractEvent {
	static readonly eventName = 'SubscriptionActive';

	constructor(public readonly data: SubscriptionActiveEventData) {
		super();
	}

	eventName(): string {
		return SubscriptionActiveEvent.eventName;
	}
}

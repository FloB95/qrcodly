import { AbstractEvent } from '@/core/event/abstract.event';

export type SubscriptionPastDueEventData = {
	userId: string;
	email: string;
	firstName?: string;
	subscriptionId?: string;
};

/**
 * Event triggered when a subscription payment is past due.
 */
export class SubscriptionPastDueEvent extends AbstractEvent {
	static readonly eventName = 'SubscriptionPastDue';

	constructor(public readonly data: SubscriptionPastDueEventData) {
		super();
	}

	eventName(): string {
		return SubscriptionPastDueEvent.eventName;
	}
}

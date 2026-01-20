import { AbstractEvent } from '@/core/event/abstract.event';

export type SubscriptionCanceledEventData = {
	userId: string;
	email: string;
	firstName?: string;
	subscriptionId?: string;
};

/**
 * Event triggered when a subscription is canceled.
 */
export class SubscriptionCanceledEvent extends AbstractEvent {
	static readonly eventName = 'SubscriptionCanceled';

	constructor(public readonly data: SubscriptionCanceledEventData) {
		super();
	}

	eventName(): string {
		return SubscriptionCanceledEvent.eventName;
	}
}

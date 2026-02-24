import { AbstractEvent } from '@/core/event/abstract.event';

export interface SubscriptionCancelInitiatedEventData {
	userId: string;
	email: string;
	firstName?: string;
	stripeSubscriptionId: string;
	stripePriceId: string;
	currentPeriodEnd: Date;
}

/**
 * Event triggered when a user initiates subscription cancellation
 * (cancel_at_period_end becomes true, subscription still active until period end).
 */
export class SubscriptionCancelInitiatedEvent extends AbstractEvent {
	static readonly eventName = 'SubscriptionCancelInitiated';

	constructor(public readonly data: SubscriptionCancelInitiatedEventData) {
		super();
	}

	eventName(): string {
		return SubscriptionCancelInitiatedEvent.eventName;
	}
}

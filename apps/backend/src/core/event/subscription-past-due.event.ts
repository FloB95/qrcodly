import { AbstractEvent } from '@/core/event/abstract.event';

export interface SubscriptionPastDueEventData {
	userId: string;
	email: string;
	firstName?: string;
	stripeSubscriptionId: string;
	stripePriceId: string;
	currentPeriodEnd: Date;
}

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

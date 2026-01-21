import { AbstractEvent } from '@/core/event/abstract.event';
import { type BillingSubscriptionJSON } from '@clerk/fastify';

export type SubscriptionPastDueEventData = BillingSubscriptionJSON;

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

import { AbstractEvent } from '@/core/event/abstract.event';
import { type BillingSubscriptionJSON } from '@clerk/fastify';

export type SubscriptionActiveEventData = BillingSubscriptionJSON;

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

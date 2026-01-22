import { AbstractEvent } from '@/core/event/abstract.event';
import { type BillingSubscriptionItemWebhookEvent } from '@clerk/fastify';

export type SubscriptionActiveEventData = BillingSubscriptionItemWebhookEvent['data'];

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

import { AbstractEvent } from '@/core/event/abstract.event';
import { type BillingSubscriptionItemWebhookEvent } from '@clerk/fastify';

export type SubscriptionPastDueEventData = BillingSubscriptionItemWebhookEvent['data'];

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

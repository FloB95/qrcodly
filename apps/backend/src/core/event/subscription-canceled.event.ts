import { AbstractEvent } from '@/core/event/abstract.event';
import { type BillingSubscriptionItemWebhookEvent } from '@clerk/fastify';

export type SubscriptionCanceledEventData = BillingSubscriptionItemWebhookEvent['data'];

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

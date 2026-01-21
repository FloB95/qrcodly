import { AbstractEvent } from '@/core/event/abstract.event';
import { type BillingSubscriptionJSON } from '@clerk/fastify';

export type SubscriptionCanceledEventData = BillingSubscriptionJSON;

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

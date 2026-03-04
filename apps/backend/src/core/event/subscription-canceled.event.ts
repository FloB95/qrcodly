import { AbstractEvent } from '@/core/event/abstract.event';

export interface SubscriptionCanceledEventData {
	userId: string;
	email: string;
	firstName?: string;
	stripeSubscriptionId: string;
	stripePriceId: string;
	currentPeriodEnd: Date;
}

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

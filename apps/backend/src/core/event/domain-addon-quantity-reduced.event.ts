import { AbstractEvent } from '@/core/event/abstract.event';

export interface DomainAddonQuantityReducedEventData {
	userId: string;
	email: string;
	firstName?: string;
	stripeSubscriptionId: string;
	/** Slots now in force, after the scheduled reduction took effect. */
	quantity: number;
}

/**
 * Event triggered when a previously scheduled reduction has actually taken effect, i.e. Stripe
 * moved the subscription into the next schedule phase and the surplus domains were switched off.
 */
export class DomainAddonQuantityReducedEvent extends AbstractEvent {
	static readonly eventName = 'DomainAddonQuantityReduced';

	constructor(public readonly data: DomainAddonQuantityReducedEventData) {
		super();
	}

	eventName(): string {
		return DomainAddonQuantityReducedEvent.eventName;
	}
}

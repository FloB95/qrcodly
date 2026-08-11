import { AbstractEvent } from '@/core/event/abstract.event';

export interface DomainAddonEventData {
	userId: string;
	email: string;
	firstName?: string;
	stripeSubscriptionId: string;
	stripePriceId: string;
	currentPeriodEnd: Date;
	/** Extra domain slots the add-on currently grants. */
	quantity: number;
}

/**
 * Event triggered when a custom-domain add-on subscription becomes active.
 */
export class DomainAddonActiveEvent extends AbstractEvent {
	static readonly eventName = 'DomainAddonActive';

	constructor(public readonly data: DomainAddonEventData) {
		super();
	}

	eventName(): string {
		return DomainAddonActiveEvent.eventName;
	}
}

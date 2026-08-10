import { AbstractEvent } from '@/core/event/abstract.event';
import { type DomainAddonEventData } from './domain-addon-active.event';

/**
 * Event triggered when a custom-domain add-on subscription has ended in Stripe.
 */
export class DomainAddonCanceledEvent extends AbstractEvent {
	static readonly eventName = 'DomainAddonCanceled';

	constructor(public readonly data: DomainAddonEventData) {
		super();
	}

	eventName(): string {
		return DomainAddonCanceledEvent.eventName;
	}
}

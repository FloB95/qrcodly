import { AbstractEvent } from '@/core/event/abstract.event';
import { type DomainAddonEventData } from './domain-addon-active.event';

/**
 * Event triggered when payment for a custom-domain add-on subscription fails.
 */
export class DomainAddonPastDueEvent extends AbstractEvent {
	static readonly eventName = 'DomainAddonPastDue';

	constructor(public readonly data: DomainAddonEventData) {
		super();
	}

	eventName(): string {
		return DomainAddonPastDueEvent.eventName;
	}
}

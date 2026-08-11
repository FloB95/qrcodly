import { AbstractEvent } from '@/core/event/abstract.event';
import { type DomainAddonEventData } from './domain-addon-active.event';

/**
 * Event triggered when a user schedules their custom-domain add-on for cancellation.
 */
export class DomainAddonCancelInitiatedEvent extends AbstractEvent {
	static readonly eventName = 'DomainAddonCancelInitiated';

	constructor(public readonly data: DomainAddonEventData) {
		super();
	}

	eventName(): string {
		return DomainAddonCancelInitiatedEvent.eventName;
	}
}

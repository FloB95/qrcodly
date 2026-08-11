import { AbstractEvent } from '@/core/event/abstract.event';

export interface DomainAddonReductionScheduledEventData {
	userId: string;
	email: string;
	firstName?: string;
	stripeSubscriptionId: string;
	/** Slots still in force until `effectiveAt`. */
	quantity: number;
	/** Slots the user drops to once the paid period ends. */
	scheduledQuantity: number;
	effectiveAt: Date;
}

/**
 * Event triggered when a user schedules a lower slot count for the end of the paid period.
 *
 * Distinct from {@link DomainAddonCancelInitiatedEvent}: nothing is being cancelled, and the email
 * has to name both the count that still applies and the one that takes over.
 */
export class DomainAddonReductionScheduledEvent extends AbstractEvent {
	static readonly eventName = 'DomainAddonReductionScheduled';

	constructor(public readonly data: DomainAddonReductionScheduledEventData) {
		super();
	}

	eventName(): string {
		return DomainAddonReductionScheduledEvent.eventName;
	}
}

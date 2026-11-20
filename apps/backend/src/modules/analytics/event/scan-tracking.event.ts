import { AbstractEvent } from '@/core/event/abstract.event';

export interface ScanTrackingEventData {
	userId: string;
	url: string;
	userAgent: string;
	hostname: string;
	language: string;
	referrer: string;
	ip: string;
	deviceType: string;
	browserName: string;
}

export class ScanTrackingEvent extends AbstractEvent {
	static readonly eventName = 'ScanTracking';

	constructor(public readonly data: ScanTrackingEventData) {
		super();
	}

	eventName(): string {
		return ScanTrackingEvent.eventName;
	}
}

import { AbstractEvent } from '@/core/event/abstract.event';
import { type TTrackScanDto } from '@shared/schemas';

/**
 * Someone followed a short URL. Emitted for every scan, unknown short codes included (then without
 * owner); the analytics module decides where the scan is counted.
 */
export class ShortUrlScannedEvent extends AbstractEvent {
	static readonly eventName = 'ShortUrlScanned';

	constructor(
		public readonly shortCode: string,
		public readonly ownerId: string | null,
		public readonly scan: TTrackScanDto,
	) {
		super();
	}

	eventName(): string {
		return ShortUrlScannedEvent.eventName;
	}
}

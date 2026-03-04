import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { EventEmitter } from '@/core/event';
import { ScanTrackingEvent, type ScanTrackingEventData } from '../event/scan-tracking.event';

@injectable()
export class DispatchTrackingEventUseCase implements IBaseUseCase {
	constructor(@inject(EventEmitter) private eventEmitter: EventEmitter) {}

	execute(data: ScanTrackingEventData): void {
		this.eventEmitter.emit(new ScanTrackingEvent(data));
	}
}

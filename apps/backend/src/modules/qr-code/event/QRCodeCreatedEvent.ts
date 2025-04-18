import { AbstractEvent } from '@/core/event/AbstractEvent';
import { type TQrCode } from '../domain/entities/QrCode';

/**
 * Event triggered when a QR code is created.
 */
export class QRCodeCreatedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'QRCodeCreated';

	constructor(public readonly qrCode: TQrCode) {
		super();
	}

	eventName(): string {
		return QRCodeCreatedEvent.eventName;
	}
}

import { AbstractEvent } from '@/core/event/AbstractEvent';
import { type TQrCode } from '../domain/entities/QrCode';

/**
 * Event triggered when a QR code is deleted.
 */
export class QrCodeDeletedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'QRCodeDeleted';

	constructor(public readonly qrCode: TQrCode) {
		super();
	}

	eventName(): string {
		return QrCodeDeletedEvent.eventName;
	}
}

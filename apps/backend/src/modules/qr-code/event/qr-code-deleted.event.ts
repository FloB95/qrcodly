import { AbstractEvent } from '@/core/event/abstract.event';
import { type TQrCode } from '../domain/entities/qr-code.entity';

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

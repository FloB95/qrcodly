import { AbstractEvent } from '@/core/event/abstract.event';
import { type TQrCode } from '../domain/entities/qr-code.entity';

/**
 * Event triggered when a QR code is updated.
 */
export class QrCodeUpdatedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'QRCodeUpdated';

	constructor(public readonly qrCode: TQrCode) {
		super();
	}

	eventName(): string {
		return QrCodeUpdatedEvent.eventName;
	}
}

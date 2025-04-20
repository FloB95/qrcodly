import { AbstractEvent } from '@/core/event/abstract.event';
import { type TQrCode } from '../domain/entities/qr-code.entity';

/**
 * Event triggered when a QR code is created.
 */
export class QrCodeCreatedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'QRCodeCreated';

	constructor(public readonly qrCode: TQrCode) {
		super();
	}

	eventName(): string {
		return QrCodeCreatedEvent.eventName;
	}
}

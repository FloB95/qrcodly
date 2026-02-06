import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { QrCodeDeletedEvent } from '../qr-code-deleted.event';

@EventHandler(QrCodeDeletedEvent.eventName)
export class QrCodeDeletedEventHandler extends AbstractEventHandler<QrCodeDeletedEvent> {
	constructor() {
		super();
	}

	/**
	 * Handles the event.
	 * @param {QrCodeDeletedEvent} event The event to handle.
	 */
	async handle(_event: QrCodeDeletedEvent): Promise<void> {}
}

import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { container } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import { ListQrCodesUseCase } from '../../useCase/list-qr-code.use-case';
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
	async handle(event: QrCodeDeletedEvent): Promise<void> {
		const appCache = container.resolve(KeyCache);

		// invalidate list cache
		if (event.qrCode.createdBy) {
			const tag = ListQrCodesUseCase.getTagKey(event.qrCode.createdBy);
			await appCache.invalidateTag(tag);
		}
	}
}

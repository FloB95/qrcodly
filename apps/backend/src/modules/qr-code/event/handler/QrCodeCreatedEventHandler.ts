import { AbstractEventHandler } from '@/core/event/handler/AbstractEventHandler';
import { EventHandler } from '@/core/decorators/EventHandler';
import { QrCodeCreatedEvent } from '../QrCodeCreatedEvent';
import { container } from 'tsyringe';
import { QrCodeService } from '../../services/QrCodeService';
import QrCodeRepository from '../../domain/repository/QrCodeRepository';
import { Logger } from '@/core/logging';

@EventHandler(QrCodeCreatedEvent.eventName)
export class QrCodeCreatedEventHandler extends AbstractEventHandler<QrCodeCreatedEvent> {
	constructor() {
		super();
	}

	/**
	 * Handles the event.
	 * @param {QrCodeCreatedEvent} event The event to handle.
	 */
	async handle(event: QrCodeCreatedEvent): Promise<void> {
		const qrCodeService = container.resolve(QrCodeService);
		const qrCodeRepository = container.resolve(QrCodeRepository);
		const logger = container.resolve(Logger);

		// generate preview image and upload to s3
		const previewImage = await qrCodeService.generatePreviewImage(event.qrCode);
		if (previewImage) {
			await qrCodeRepository.update(event.qrCode, { previewImage });
			logger.debug('QR code preview image generated and uploaded successfully', {
				id: event.qrCode.id,
				createdBy: event.qrCode.createdBy,
			});
		}
	}
}

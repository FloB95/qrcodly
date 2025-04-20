import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { QrCodeCreatedEvent } from '../qr-code-created.event';
import { container } from 'tsyringe';
import QrCodeRepository from '../../domain/repository/qr-code.repository';
import { Logger } from '@/core/logging';
import { ImageService } from '../../services/image.service';

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
		const imageService = container.resolve(ImageService);
		const qrCodeRepository = container.resolve(QrCodeRepository);
		const logger = container.resolve(Logger);
		
		// skip if QR code has an image CURRENTLY not supported
		if (event.qrCode.config.image) {
			logger.debug('QR code has an image, skipping preview image generation', {
				id: event.qrCode.id,
				createdBy: event.qrCode.createdBy,
			});
			return;
		}

		// generate preview image and upload to s3
		const previewImage = await imageService.generatePreview(event.qrCode);
		if (previewImage) {
			await qrCodeRepository.update(event.qrCode, { previewImage });
			logger.debug('QR code preview image generated and uploaded successfully', {
				id: event.qrCode.id,
				createdBy: event.qrCode.createdBy,
			});
		}
	}
}

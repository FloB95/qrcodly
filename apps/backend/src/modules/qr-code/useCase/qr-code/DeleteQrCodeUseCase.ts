import { IBaseUseCase } from '@/core/interface/IBaseUseCase';
import QrCodeRepository from '../../domain/repository/QrCodeRepository';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { TQrCode } from '../../domain/entities/QrCode';
import { ImageService } from '../../services/ImageService';
import { EventEmitter } from '@/core/event';
import { QrCodeDeletedEvent } from '../../event/QrCodeDeletedEvent';

/**
 * Use case for deleting a QRcode entity.
 */
@injectable()
export class DeleteQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(Logger) private logger: Logger,
		@inject(ImageService) private imageService: ImageService,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
	) {}

	/**
	 * Executes the use case to delete a QRcode entity.
	 * @param qrCode The QRcode entity to be deleted.
	 * @returns A promise that resolves to true if the deletion was successful, otherwise false.
	 */
	async execute(qrCode: TQrCode, deletedBy: string): Promise<boolean> {
		await this.imageService.deleteImage(qrCode.config.image);
		await this.imageService.deleteImage(qrCode.previewImage ?? undefined);
		const res = await this.qrCodeRepository.delete(qrCode);

		// log the deletion
		if (res) {
			// Emit the QrCodeCreatedEvent.
			const event = new QrCodeDeletedEvent(qrCode);
			this.eventEmitter.emit(event);

			this.logger.info('QR code deleted successfully', {
				id: qrCode.id,
				deletedBy: deletedBy,
			});
		} else {
			this.logger.warn('Failed to delete QR code', {
				id: qrCode.id,
			});
		}

		return res;
	}
}

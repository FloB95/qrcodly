import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { ImageService } from '@/core/services/image.service';
import { QrCodeDeletedEvent } from '../event/qr-code-deleted.event';
import { TQrCode } from '../domain/entities/qr-code.entity';

/**
 * Use case for deleting a QRcode entity.
 */
@injectable()
export class DeleteQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
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
		// Soft-delete the linked short URL before QR code deletion (FK SET NULL loses the reference)
		const linkedShortUrl = await this.shortUrlRepository.findOneByQrCodeId(qrCode.id);
		if (linkedShortUrl) {
			await this.shortUrlRepository.update(linkedShortUrl, {
				deletedAt: new Date(),
				isActive: false,
				updatedAt: new Date(),
			});
		}

		await this.imageService.deleteImage(qrCode.config.image);
		await this.imageService.deleteImage(qrCode.previewImage ?? undefined);
		const res = await this.qrCodeRepository.delete(qrCode);

		// log the deletion
		if (res) {
			// Emit the QrCodeCreatedEvent.
			const event = new QrCodeDeletedEvent(qrCode);
			this.eventEmitter.emit(event);

			this.logger.info('qrCode.deleted', {
				qrCode: {
					id: qrCode.id,
					deletedBy: deletedBy,
				},
			});
		} else {
			this.logger.error('error.qrCode.delete', {
				qrCode: {
					id: qrCode.id,
					deletedBy: deletedBy,
				},
			});
		}

		return res;
	}
}

import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { ImageService } from '@/core/services/image.service';
import { QrCodeDeletedEvent } from '../event/qr-code-deleted.event';
import { TQrCode } from '../domain/entities/qr-code.entity';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { qrCodesDeleted } from '@/core/metrics';

@injectable()
export class DeleteQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(Logger) private logger: Logger,
		@inject(ImageService) private imageService: ImageService,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
	) {}

	async execute(qrCode: TQrCode, deletedBy: string): Promise<boolean> {
		await this.imageService.deleteImage(qrCode.config.image);
		await this.imageService.deleteImage(qrCode.previewImage ?? undefined);

		const res = await UnitOfWork.run(async () => {
			// Soft-delete immediately before QR deletion so FK SET NULL doesn't lose the reference
			const linkedShortUrl = await this.shortUrlRepository.findOneByQrCodeId(qrCode.id);
			if (linkedShortUrl) {
				await this.shortUrlRepository.update(linkedShortUrl, {
					deletedAt: new Date(),
					isActive: false,
					updatedAt: new Date(),
				});
			}

			return this.qrCodeRepository.delete(qrCode);
		});

		if (res) {
			const event = new QrCodeDeletedEvent(qrCode);
			this.eventEmitter.emit(event);

			this.logger.info('qrCode.deleted', {
				qrCode: {
					id: qrCode.id,
					deletedBy: deletedBy,
				},
			});
			qrCodesDeleted.add(1);
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

import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { isHostedPageContent } from '@shared/schemas';
import { container, inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { ImageService } from '@/core/services/image.service';
import { QrCodeDeletedEvent } from '../event/qr-code-deleted.event';
import { TQrCode } from '../domain/entities/qr-code.entity';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { qrCodesDeleted } from '@/core/metrics';
import { HostedPageService } from '@/modules/hosted-page/service/hosted-page.service';

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

		let linkedShortCode: string | undefined;
		let deletedPageOwner: string | undefined;
		const res = await UnitOfWork.run(async () => {
			// Soft-delete immediately before QR deletion so FK SET NULL doesn't lose the reference
			const linkedShortUrl = await this.shortUrlRepository.findOneByQrCodeId(qrCode.id);
			linkedShortCode = linkedShortUrl?.shortCode;
			if (linkedShortUrl) {
				await this.shortUrlRepository.update(linkedShortUrl, {
					deletedAt: new Date(),
					isActive: false,
					updatedAt: new Date(),
				});
			}

			const deleted = await this.qrCodeRepository.delete(qrCode);
			if (linkedShortUrl?.hostedPageId) {
				const page = await container
					.resolve(HostedPageService)
					.deletePage(linkedShortUrl.hostedPageId);
				deletedPageOwner = page?.createdBy;
			} else if (isHostedPageContent(qrCode.content)) {
				this.logger.warn('qrCode.deleted.hosted_page_missing', { qrCode: { id: qrCode.id } });
			}
			return deleted;
		});

		if (res) {
			if (deletedPageOwner) {
				await container.resolve(HostedPageService).afterChange(deletedPageOwner, linkedShortCode);
			}

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

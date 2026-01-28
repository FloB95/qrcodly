import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { TPublicSharedQrCodeResponseDto } from '@shared/schemas';
import QrCodeShareRepository from '../domain/repository/qr-code-share.repository';
import { ImageService } from '@/core/services/image.service';
import { QrCodeShareNotFoundError } from '../error/http/qr-code-share-not-found.error';

/**
 * Use case for retrieving a publicly shared QR code.
 */
@injectable()
export class GetPublicSharedQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeShareRepository) private qrCodeShareRepository: QrCodeShareRepository,
		@inject(ImageService) private imageService: ImageService,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Retrieves a shared QR code by its share token.
	 * Only returns data based on the share configuration.
	 * @param shareToken - The unique share token.
	 * @returns The public QR code data filtered by share config.
	 */
	async execute(shareToken: string): Promise<TPublicSharedQrCodeResponseDto> {
		const share = await this.qrCodeShareRepository.findByShareToken(shareToken);

		if (!share || !share.isActive) {
			throw new QrCodeShareNotFoundError();
		}

		const qrCode = share.qrCode;
		if (!qrCode) {
			throw new QrCodeShareNotFoundError();
		}

		// Convert S3 image paths to presigned URLs
		if (qrCode.config.image) {
			qrCode.config.image = await this.imageService.getSignedUrl(qrCode.config.image);
		}

		let previewImage = qrCode.previewImage;
		if (previewImage) {
			previewImage = (await this.imageService.getSignedUrl(previewImage)) ?? null;
		}

		this.logger.debug('qrCodeShare.publicAccess', {
			shareToken,
			qrCodeId: qrCode.id,
		});

		return {
			name: share.config.showName ? qrCode.name : null,
			content: qrCode.content,
			config: qrCode.config,
			shareConfig: share.config,
			previewImage,
			qrCodeData: qrCode.qrCodeData,
		};
	}
}

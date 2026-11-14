import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import {
	isHostedPageType,
	TPublicSharedQrCodeResponseDto,
	withoutHostedFileKeys,
} from '@shared/schemas';
import QrCodeShareRepository from '../domain/repository/qr-code-share.repository';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { type TQrCode } from '../domain/entities/qr-code.entity';
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
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
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

		// a hosted code stores only its type: load it through the repository to get its page
		const qrCode =
			share.qrCode && isHostedPageType(share.qrCode.content.type)
				? await this.qrCodeRepository.findOneById(share.qrCode.id)
				: (share.qrCode as TQrCode | undefined);
		if (!qrCode) {
			throw new QrCodeShareNotFoundError();
		}

		if (qrCode.config.image) {
			qrCode.config.image = this.imageService.getPublicUrl(qrCode.config.image);
		}

		let previewImage = qrCode.previewImage;
		if (previewImage) {
			previewImage = this.imageService.getPublicUrl(previewImage);
		}

		this.logger.debug('qrCodeShare.publicAccess', {
			sharedQrCode: {
				shareToken,
				qrCodeId: qrCode.id,
			},
		});

		return {
			name: share.config.showName ? qrCode.name : null,
			// hosted files are only served through their page, which checks whether it is online
			content: withoutHostedFileKeys(qrCode.content),
			config: qrCode.config,
			shareConfig: share.config,
			previewImage,
			qrCodeData: qrCode.qrCodeData,
		};
	}
}

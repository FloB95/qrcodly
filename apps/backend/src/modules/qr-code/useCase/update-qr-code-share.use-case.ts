import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { objDiff, TQrCodeShareConfig, TUpdateQrCodeShareDto } from '@shared/schemas';
import QrCodeShareRepository from '../domain/repository/qr-code-share.repository';
import { TQrCodeShare } from '../domain/entities/qr-code-share.entity';

/**
 * Use case for updating a QR Code share link configuration.
 */
@injectable()
export class UpdateQrCodeShareUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeShareRepository) private qrCodeShareRepository: QrCodeShareRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Updates the configuration of a share link.
	 * @param share - The existing share entity.
	 * @param dto - The updates to apply.
	 * @returns The updated share entity.
	 */
	async execute(share: TQrCodeShare, dto: TUpdateQrCodeShareDto): Promise<TQrCodeShare> {
		const updatedConfig: TQrCodeShareConfig = { ...share.config, ...dto };

		const diffs = objDiff(share.config, updatedConfig) as Partial<TQrCodeShareConfig>;

		// Don't update if no changes
		if (Object.keys(diffs).length < 1) {
			return share;
		}

		await this.qrCodeShareRepository.update(share, {
			config: updatedConfig,
		});

		this.logger.info('qrCodeShare.updated', {
			sharedQrCode: {
				shareId: share.id,
				qrCodeId: share.qrCodeId,
				updates: diffs,
			},
		});

		const updatedShare = await this.qrCodeShareRepository.findByQrCodeId(share.qrCodeId);
		if (!updatedShare) {
			throw new Error('Failed to retrieve updated share link.');
		}

		return updatedShare;
	}
}

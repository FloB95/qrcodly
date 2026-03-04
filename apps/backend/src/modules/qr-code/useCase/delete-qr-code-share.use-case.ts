import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import QrCodeShareRepository from '../domain/repository/qr-code-share.repository';
import { TQrCodeShare } from '../domain/entities/qr-code-share.entity';

/**
 * Use case for deleting a QR Code share link.
 */
@injectable()
export class DeleteQrCodeShareUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeShareRepository) private qrCodeShareRepository: QrCodeShareRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Deletes a share link.
	 * @param share - The share entity to delete.
	 */
	async execute(share: TQrCodeShare): Promise<void> {
		await this.qrCodeShareRepository.delete(share);

		this.logger.info('qrCodeShare.deleted', {
			sharedQrCode: {
				shareId: share.id,
				qrCodeId: share.qrCodeId,
			},
		});
	}
}

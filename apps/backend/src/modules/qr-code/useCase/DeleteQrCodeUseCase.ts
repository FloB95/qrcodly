import { IBaseUseCase } from '@/core/interface/IBaseUseCase';
import QrCodeRepository from '../domain/repository/QrCodeRepository';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { TQrCode } from '../domain/entities/QrCode';
import { QrCodeService } from '../services/QrCodeService';

/**
 * Use case for deleting a QRcode entity.
 */
@injectable()
export class DeleteQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(Logger) private logger: Logger,
		@inject(QrCodeService) private qrCodeService: QrCodeService,
	) {}

	/**
	 * Executes the use case to delete a QRcode entity.
	 * @param qrCode The QRcode entity to be deleted.
	 * @returns A promise that resolves to true if the deletion was successful, otherwise false.
	 */
	async execute(qrCode: TQrCode, deletedBy: string): Promise<boolean> {
		await this.qrCodeService.deleteQrCodeImages(qrCode);
		const res = await this.qrCodeRepository.delete(qrCode);

		// log the deletion
		if (res) {
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

import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { ISqlQueryFindBy } from '@/core/interface/repository.interface';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { ImageService } from '@/core/services/image.service';
import { TQrCode } from '../domain/entities/qr-code.entity';

/**
 * Use case for retrieving QR codes based on query parameters.
 */
@injectable()
export class ListQrCodesUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(ImageService) private imageService: ImageService,
	) {}

	/**
	 * Executes the use case to retrieve QR codes based on the provided query parameters.
	 * @param limit The maximum number of QR codes to retrieve.
	 * @param page The page number for pagination.
	 * @param where Optional filter criteria for the QR codes.
	 * @returns An object containing the list of QR codes and the total count.
	 */
	async execute({ limit, page, where }: ISqlQueryFindBy<TQrCode>) {
		// Retrieve QR codes based on the query parameters
		const qrCodes = await this.qrCodeRepository.findAll({
			limit,
			page,
			where,
		});

		// Convert image path to presigned URL
		await Promise.all(
			qrCodes.map(async (qrCode) => {
				if (qrCode.config.image) {
					qrCode.config.image = await this.imageService.getSignedUrl(qrCode.config.image);
				}
				if (qrCode.previewImage) {
					qrCode.previewImage = (await this.imageService.getSignedUrl(qrCode.previewImage)) ?? null;
				}
			}),
		);

		// Count the total number of QR codes
		const total = await this.qrCodeRepository.countTotal(where);

		return {
			qrCodes,
			total,
		};
	}
}

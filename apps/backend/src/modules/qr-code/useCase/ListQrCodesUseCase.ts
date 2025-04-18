import { IBaseUseCase } from '@/core/interface/IBaseUseCase';
import { inject, injectable } from 'tsyringe';
import QrCodeRepository from '../domain/repository/QrCodeRepository';
import { ISqlQueryFindBy } from '@/core/interface/IRepository';
import { TQrCode } from '../domain/entities/QrCode';

/**
 * Use case for retrieving QR codes based on query parameters.
 */
@injectable()
export class ListQrCodesUseCase implements IBaseUseCase {
	constructor(@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository) {}

	/**
	 * Executes the use case to retrieve QR codes based on the provided query parameters.
	 * @param limit The maximum number of QR codes to retrieve.
	 * @param offset The page number for pagination.
	 * @param where Optional filter criteria for the QR codes.
	 * @returns An object containing the list of QR codes and the total count.
	 */
	async execute({ limit, offset: page, where }: ISqlQueryFindBy<TQrCode>) {
		const offset = (page - 1) * limit;

		// Retrieve QR codes based on the query parameters
		const qrCodes = await this.qrCodeRepository.findAll({
			limit,
			offset,
			where,
		});

		// Count the total number of QR codes
		const total = await this.qrCodeRepository.countTotal(where);

		return {
			qrCodes,
			total,
		};
	}
}

import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { ISqlQueryFindBy } from '@/core/interface/repository.interface';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { ImageService } from '@/core/services/image.service';
import { TQrCode, TQrCodeWithRelations } from '../domain/entities/qr-code.entity';
import { KeyCache } from '@/core/cache';

type ListResponse = {
	total: number;
	qrCodes: TQrCodeWithRelations[];
};

/**
 * Use case for retrieving QR codes based on query parameters.
 */
@injectable()
export class ListQrCodesUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(ImageService) private imageService: ImageService,
		@inject(KeyCache) private appCache: KeyCache,
	) {}

	/**
	 * Executes the use case to retrieve QR codes based on the provided query parameters.
	 * @param limit The maximum number of QR codes to retrieve.
	 * @param page The page number for pagination.
	 * @param where Optional filter criteria for the QR codes.
	 * @returns An object containing the list of QR codes and the total count.
	 */
	async execute({ limit, page, where }: ISqlQueryFindBy<TQrCode>): Promise<ListResponse> {
		// return cache if exists
		const cache = await this.appCache.get(this.getCacheKey({ limit, page, where }));
		if (cache) {
			return JSON.parse(cache as string) as ListResponse;
		}

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

		const tags =
			where && typeof where === 'object' && 'createdBy' in where && where.createdBy?.eq
				? [ListQrCodesUseCase.getTagKey(where.createdBy.eq as string)]
				: [];

		// add cache
		await this.appCache.set(
			this.getCacheKey({ limit, page, where }),
			JSON.stringify({
				qrCodes,
				total,
			}),
			1 * 24 * 60 * 60,
			tags,
		);

		return {
			qrCodes,
			total,
		};
	}

	public static getTagKey(createdBy: string) {
		return `qr-codes-list:user:${createdBy}`;
	}

	private getCacheKey({ limit, page, where }: ISqlQueryFindBy<TQrCode>): string {
		return `qr-code-list:${limit}-${page}-${JSON.stringify(where)}`;
	}
}

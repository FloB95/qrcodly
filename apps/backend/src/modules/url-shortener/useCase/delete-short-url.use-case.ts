import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrl } from '../domain/entities/short-url.entity';
import { BadRequestError } from '@/core/error/http';

/**
 * Use case for soft-deleting a standalone short URL.
 */
@injectable()
export class DeleteShortUrlUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Soft-deletes a standalone short URL by setting deletedAt.
	 * Only allows deletion of standalone short URLs (qrCodeId IS NULL).
	 * @param shortUrl The short URL entity to delete.
	 * @param userId The ID of the user performing the deletion.
	 */
	async execute(shortUrl: TShortUrl, userId: string): Promise<void> {
		if (shortUrl.qrCodeId != null) {
			throw new BadRequestError(
				'Cannot delete a short URL linked to a QR code. Delete the QR code instead.',
			);
		}

		await this.shortUrlRepository.update(shortUrl, {
			deletedAt: new Date(),
		});

		this.logger.info('shortUrl.deleted', {
			shortUrl: {
				id: shortUrl.id,
				shortCode: shortUrl.shortCode,
				deletedBy: userId,
			},
		});
	}
}

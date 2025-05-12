import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrl } from '../domain/entities/short-url.entity';
import { TUpdateShortUrlDto } from '@shared/schemas';

/**
 * Use case for updating a ShortUrl entity.
 */
@injectable()
export class UpdateShortUrlUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
	) {}

	/**
	 * Executes the use case to update an existing ShortUrl entity based on the given DTO.
	 * @param id The ID of the ShortUrl to be updated.
	 * @param updatesDto The data transfer object containing the updated details for the ShortUrl.
	 * @param updatedBy The ID of the user who updated the ShortUrl.
	 * @returns A promise that resolves with the updated ShortUrl entity.
	 */
	async execute(
		shortUrl: TShortUrl,
		updatesDto: TUpdateShortUrlDto,
		updatedBy: string,
		linkedQrCodeId?: string,
	): Promise<TShortUrl> {
		const updates: Partial<TShortUrl> = {
			...updatesDto,
			updatedAt: new Date(),
		};

		// Persist the updated ShortUrl entity in the database.
		await this.shortUrlRepository.update(shortUrl, {
			...updates,
			qrCodeId: linkedQrCodeId,
		});

		// Retrieve the updated ShortUrl entity from the database.
		const result = await this.shortUrlRepository.findOneById(shortUrl.id);

		// Emit the ShortUrlUpdatedEvent.
		// const event = new ShortUrlUpdatedEvent(result);
		// this.eventEmitter.emit(event);

		this.logger.info('Short URL updated successfully', {
			id: shortUrl.id,
			qrCodeId: shortUrl.qrCodeId,
			updates,
			updatedBy,
		});

		return result!;
	}
}

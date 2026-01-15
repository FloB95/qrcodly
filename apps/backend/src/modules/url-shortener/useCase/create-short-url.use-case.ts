import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrl } from '../domain/entities/short-url.entity';
import { TCreateShortUrlDto } from '@shared/schemas';

/**
 * Use case for creating a ShortUrl entity.
 */
@injectable()
export class CreateShortUrlUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Executes the use case to create a new ShortUrl entity based on the given DTO.
	 * @param dto The data transfer object containing the details for the ShortUrl to be created.
	 * @param createdBy The ID of the user who created the ShortUrl.
	 * @returns A promise that resolves with the newly created ShortUrl entity.
	 */
	async execute(dto: TCreateShortUrlDto, createdBy: string): Promise<TShortUrl> {
		const newId = await this.shortUrlRepository.generateId();
		const shortCode = await this.shortUrlRepository.generateShortCode();

		const shortUrl: Omit<TShortUrl, 'createdAt' | 'updatedAt'> = {
			id: newId,
			shortCode,
			qrCodeId: null,
			...dto,
			createdBy,
		};

		// Create the ShortUrl entity in the database.
		await this.shortUrlRepository.create(shortUrl);

		// Retrieve the created ShortUrl entity from the database.
		const createdShortUrl = await this.shortUrlRepository.findOneById(newId);
		if (!createdShortUrl) throw new Error('Failed to create ShortUrl');

		// Emit the ShortUrlCreatedEvent.
		// const event = new ShortUrlCreatedEvent(createdShortUrl);
		// this.eventEmitter.emit(event);

		this.logger.info('shortUrl.created', {
			shortUrl: {
				id: createdShortUrl.id,
				createdBy: createdShortUrl.createdBy,
			},
		});

		return createdShortUrl;
	}
}

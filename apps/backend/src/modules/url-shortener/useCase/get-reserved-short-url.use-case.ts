import { inject, injectable } from 'tsyringe';
import { CreateShortUrlUseCase } from './create-short-url.use-case';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrl } from '../domain/entities/short-url.entity';

@injectable()
export class GetReservedShortCodeUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(CreateShortUrlUseCase) private createShortUrlUseCase: CreateShortUrlUseCase,
	) {}

	async execute(userId: string): Promise<TShortUrl> {
		// Check for reserved short URLs
		const reservedShortUrl = await this.shortUrlRepository.findAll({
			limit: 1,
			offset: 0,
			where: {
				createdBy: {
					eq: userId,
				},
				destinationUrl: {
					eq: null,
				},
			},
		});

		console.log('reservedShortUrl', reservedShortUrl);

		// If user has any reserved short URL, return the first one
		if (reservedShortUrl.length > 0) {
			return reservedShortUrl[0];
		}

		// Otherwise, create a new short URL
		const shortUrl = await this.createShortUrlUseCase.execute(
			{
				destinationUrl: null,
			},
			userId,
		);

		return shortUrl;
	}
}

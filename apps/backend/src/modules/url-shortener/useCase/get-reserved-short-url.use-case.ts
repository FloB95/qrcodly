import { inject, injectable } from 'tsyringe';
import { CreateShortUrlUseCase } from './create-short-url.use-case';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrlWithDomain } from '../domain/entities/short-url.entity';
import { GetDefaultCustomDomainUseCase } from '@/modules/custom-domain/useCase/get-default-custom-domain.use-case';
import { Logger } from '@/core/logging';

@injectable()
export class GetReservedShortCodeUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(CreateShortUrlUseCase) private createShortUrlUseCase: CreateShortUrlUseCase,
		@inject(GetDefaultCustomDomainUseCase)
		private getDefaultCustomDomainUseCase: GetDefaultCustomDomainUseCase,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(userId: string): Promise<TShortUrlWithDomain> {
		const defaultDomain = await this.getDefaultCustomDomainUseCase.execute(userId);
		const defaultDomainId = defaultDomain?.id ?? null;

		const reservedShortUrls = await this.shortUrlRepository.findAll({
			limit: 1,
			page: 0,
			where: {
				createdBy: {
					eq: userId,
				},
				destinationUrl: {
					eq: null,
				},
				qrCodeId: {
					eq: null,
				},
			},
		});

		if (reservedShortUrls.length > 0) {
			const existingUrl = reservedShortUrls[0];
			if (existingUrl.customDomainId !== defaultDomainId) {
				await this.shortUrlRepository.update(existingUrl, {
					customDomainId: defaultDomainId,
					updatedAt: new Date(),
				});
				this.logger.info('shortUrl.updated.customDomainId', {
					shortUrl: {
						userId,
						shortUrlId: existingUrl.id,
						oldDomainId: existingUrl.customDomainId,
						newDomainId: defaultDomainId,
					},
				});
			}

			// Fetch with domain info and return
			const urlWithDomain = await this.shortUrlRepository.findOneById(existingUrl.id);
			return urlWithDomain!;
		}

		const shortUrl = await this.createShortUrlUseCase.execute(
			{
				destinationUrl: null,
				customDomainId: defaultDomainId,
				isActive: false,
			},
			userId,
		);

		return shortUrl;
	}
}

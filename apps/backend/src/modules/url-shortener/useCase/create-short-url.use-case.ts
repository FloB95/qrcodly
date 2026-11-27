import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrlCreateInput, TShortUrlWithDomain } from '../domain/entities/short-url.entity';
import { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import { shortUrlsCreated } from '@/core/metrics';
import { DestinationUrlSafetyService } from '../service/destination-url-safety.service';
import { RedirectLoopError } from '../error/http/redirect-loop.error';
import { isShortenedDestinationUrl } from '../utils';
import { isDuplicateEntryError } from '@/core/db/utils';
import { ShortUrlAliasService } from '../service/short-url-alias.service';
import { ShortUrlAliasRequiresCustomDomainError } from '../error/http/short-url-alias-requires-custom-domain.error';
import { ShortUrlAliasTakenError } from '../error/http/short-url-alias-taken.error';

/**
 * Internal input type for creating a short URL.
 * Broader than the API DTO — allows null destinationUrl for reserved URLs (QR code flow).
 */
type CreateShortUrlInput = {
	destinationUrl: string | null;
	isActive: boolean;
	customDomainId?: string | null;
	name?: string | null;
	alias?: string;
};

/**
 * Use case for creating a ShortUrl entity.
 */
@injectable()
export class CreateShortUrlUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(CustomDomainValidationService)
		private customDomainValidationService: CustomDomainValidationService,
		@inject(Logger) private logger: Logger,
		@inject(DestinationUrlSafetyService)
		private destinationUrlSafetyService: DestinationUrlSafetyService,
		@inject(ShortUrlAliasService) private shortUrlAliasService: ShortUrlAliasService,
	) {}

	/**
	 * Executes the use case to create a new ShortUrl entity based on the given DTO.
	 * @param dto The data transfer object containing the details for the ShortUrl to be created.
	 * @param createdBy The ID of the user who created the ShortUrl.
	 * @returns A promise that resolves with the newly created ShortUrl entity.
	 */
	async execute(dto: CreateShortUrlInput, createdBy: string): Promise<TShortUrlWithDomain> {
		// refuse a destination that is itself one of our short URLs — chaining hides the real target
		// behind a hop that no safety check ever sees
		if (isShortenedDestinationUrl(dto.destinationUrl)) {
			throw new RedirectLoopError();
		}

		await this.destinationUrlSafetyService.assertDestinationUrlSafe(
			dto.destinationUrl,
			createdBy,
			'create',
		);

		// Validate custom domain ownership and readiness if provided
		if (dto.customDomainId) {
			await this.customDomainValidationService.validateForUserUse(dto.customDomainId, createdBy);
		}

		if (dto.alias) {
			if (!dto.customDomainId) throw new ShortUrlAliasRequiresCustomDomainError();
			await this.shortUrlAliasService.assertAvailable(dto.customDomainId, dto.alias);
		}

		const newId = await this.shortUrlRepository.generateId();
		const shortCode = await this.shortUrlRepository.generateShortCode();

		const shortUrl: TShortUrlCreateInput = {
			id: newId,
			shortCode,
			alias: dto.alias ?? null,
			name: dto.name ?? null,
			qrCodeId: null,
			customDomainId: dto.customDomainId ?? null,
			destinationUrl: dto.destinationUrl,
			isActive: dto.isActive,
			createdBy,
			deletedAt: null,
		};

		// Create the ShortUrl entity in the database.
		try {
			await this.shortUrlRepository.create(shortUrl);
		} catch (error) {
			// someone took the alias between the check and the insert
			if (dto.alias && isDuplicateEntryError(error)) throw new ShortUrlAliasTakenError();
			throw error;
		}

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
				customDomainId: createdShortUrl.customDomainId,
			},
		});
		shortUrlsCreated.add(1);

		return createdShortUrl;
	}
}

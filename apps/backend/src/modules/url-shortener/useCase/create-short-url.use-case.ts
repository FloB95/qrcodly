import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrlInsert, TShortUrlWithDomain } from '../domain/entities/short-url.entity';
import { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import { shortUrlsCreated } from '@/core/metrics';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { BadRequestError } from '@/core/error/http';
import { ConflictError } from '@/core/error/http/conflict.error';
import { isReservedSlug } from '@shared/schemas';
import { CreateCustomSlugPolicy } from '../policies/create-custom-slug.policy';

/**
 * Internal input type for creating a short URL.
 * Broader than the API DTO — allows null destinationUrl for reserved URLs (QR code flow).
 */
type CreateShortUrlInput = {
	destinationUrl: string | null;
	isActive: boolean;
	customDomainId?: string | null;
	customSlug?: string | null;
	name?: string | null;
};

@injectable()
export class CreateShortUrlUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(CustomDomainValidationService)
		private customDomainValidationService: CustomDomainValidationService,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * `user` is required when `dto.customSlug` is set so the Pro-policy can run.
	 * Internal flows (e.g. reserved short URL for QR codes) call without `user`
	 * and never set `customSlug`.
	 */
	async execute(
		dto: CreateShortUrlInput,
		createdBy: string,
		user?: TUser,
	): Promise<TShortUrlWithDomain> {
		if (dto.customDomainId) {
			await this.customDomainValidationService.validateForUserUse(dto.customDomainId, createdBy);
		}

		const customSlug = await this.resolveCustomSlug(dto, user);
		const shortCode = await this.shortUrlRepository.generateShortCode();
		const newId = this.shortUrlRepository.generateId();

		const shortUrl: TShortUrlInsert = {
			id: newId,
			shortCode,
			customSlug,
			name: dto.name ?? null,
			qrCodeId: null,
			customDomainId: dto.customDomainId ?? null,
			destinationUrl: dto.destinationUrl,
			isActive: dto.isActive,
			createdBy,
			deletedAt: null,
		};

		await this.shortUrlRepository.create(shortUrl);

		const createdShortUrl = await this.shortUrlRepository.findOneById(newId);
		if (!createdShortUrl) throw new Error('Failed to create ShortUrl');

		this.logger.info('shortUrl.created', {
			shortUrl: {
				id: createdShortUrl.id,
				createdBy: createdShortUrl.createdBy,
				customDomainId: createdShortUrl.customDomainId,
				hasCustomSlug: customSlug !== null,
			},
		});
		shortUrlsCreated.add(1);

		return createdShortUrl;
	}

	private async resolveCustomSlug(dto: CreateShortUrlInput, user?: TUser): Promise<string | null> {
		if (!dto.customSlug) return null;

		if (!dto.customDomainId) {
			throw new BadRequestError('A custom slug requires a custom domain.');
		}

		new CreateCustomSlugPolicy(user).checkAccess();

		const slug = dto.customSlug.toLowerCase();

		if (isReservedSlug(slug)) {
			throw new ConflictError(`Slug "${slug}" is reserved.`);
		}

		const taken = await this.shortUrlRepository.findOneActiveByCustomSlugAndDomain(
			slug,
			dto.customDomainId,
		);
		if (taken) {
			throw new ConflictError(`Slug "${slug}" is already taken on this domain.`);
		}

		return slug;
	}
}

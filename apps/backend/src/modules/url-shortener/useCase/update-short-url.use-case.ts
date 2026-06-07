import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrl } from '../domain/entities/short-url.entity';
import QrCodeRepository from '@/modules/qr-code/domain/repository/qr-code.repository';
import { QrCodeNotFoundError } from '@/modules/qr-code/error/http/qr-code-not-found.error';
import { RedirectLoopError } from '../error/http/redirect-loop.error';
import { buildShortUrl } from '../utils';
import { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { BadRequestError } from '@/core/error/http';
import { ConflictError } from '@/core/error/http/conflict.error';
import { isReservedSlug } from '@shared/schemas';
import { CreateCustomSlugPolicy } from '../policies/create-custom-slug.policy';

/**
 * Internal input type for updating a short URL.
 * Broader than the API DTO — allows customDomainId for internal flows (QR code strategies).
 */
type UpdateShortUrlInput = {
	destinationUrl?: string | null;
	isActive?: boolean;
	customDomainId?: string | null;
	customSlug?: string | null;
	name?: string | null;
};

/**
 * Use case for updating a ShortUrl entity.
 */
@injectable()
export class UpdateShortUrlUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(CustomDomainValidationService)
		private customDomainValidationService: CustomDomainValidationService,
		@inject(Logger) private logger: Logger,
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
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
		updatesDto: UpdateShortUrlInput,
		updatedBy: string,
		linkedQrCodeId?: string,
		user?: TUser,
	): Promise<TShortUrl> {
		// Validate custom domain ownership and readiness if changing it
		if (updatesDto.customDomainId !== undefined && updatesDto.customDomainId !== null) {
			await this.customDomainValidationService.validateForUserUse(
				updatesDto.customDomainId,
				updatedBy,
			);
		}

		// customSlug is one-shot: it can be set ONCE on a row whose slug is null
		// (typically a "reserved" shortUrl getting wired up to a fresh QR-Code).
		// Once set, it is immutable — changing it would break printed QR-Codes.
		const desiredCustomSlug = await this.resolveCustomSlugUpdate(shortUrl, updatesDto, user);

		const updates: Partial<TShortUrl> = {
			...updatesDto,
			...(desiredCustomSlug !== undefined ? { customSlug: desiredCustomSlug } : {}),
			updatedAt: new Date(),
		};

		// prevent linking if qr code points to same url to avoid redirect loops
		if (updatesDto?.destinationUrl === buildShortUrl(shortUrl.shortCode)) {
			throw new RedirectLoopError();
		}

		if (linkedQrCodeId) {
			// verify that qr code exists
			const qrCode = await this.qrCodeRepository.findOneById(linkedQrCodeId);
			if (!qrCode) {
				throw new QrCodeNotFoundError();
			}
		}

		// Persist the updated ShortUrl entity in the database.
		const updatePayload: Partial<TShortUrl> = { ...updates };
		if (linkedQrCodeId !== undefined) {
			updatePayload.qrCodeId = linkedQrCodeId;
		}
		await this.shortUrlRepository.update(shortUrl, updatePayload);

		// Retrieve the updated ShortUrl entity from the database.
		const result = await this.shortUrlRepository.findOneById(shortUrl.id);

		// Emit the ShortUrlUpdatedEvent.
		// const event = new ShortUrlUpdatedEvent(result);
		// this.eventEmitter.emit(event);

		this.logger.info('shortUrl.updated', {
			shortUrl: {
				id: shortUrl.id,
				qrCodeId: shortUrl.qrCodeId,
				customDomainId: result?.customDomainId,
				updates,
				updatedBy,
			},
		});

		return result!;
	}

	private async resolveCustomSlugUpdate(
		shortUrl: TShortUrl,
		updatesDto: UpdateShortUrlInput,
		user?: TUser,
	): Promise<string | null | undefined> {
		if (updatesDto.customSlug === undefined) return undefined; // no change requested
		if (updatesDto.customSlug === null) {
			// Explicit clear is allowed (used by the cascade-soft-delete path).
			return null;
		}

		// Setting a slug once → immutable thereafter.
		if (shortUrl.customSlug !== null) {
			throw new BadRequestError(
				'A custom slug cannot be changed after it is set. Create a new short URL instead.',
			);
		}

		// Slugs require a custom domain; pick the requested or the existing one.
		const targetDomainId =
			updatesDto.customDomainId !== undefined ? updatesDto.customDomainId : shortUrl.customDomainId;
		if (!targetDomainId) {
			throw new BadRequestError('A custom slug requires a custom domain.');
		}

		new CreateCustomSlugPolicy(user).checkAccess();

		const slug = updatesDto.customSlug.toLowerCase();
		if (isReservedSlug(slug)) {
			throw new ConflictError(`Slug "${slug}" is reserved.`);
		}
		const taken = await this.shortUrlRepository.findOneActiveByCustomSlugAndDomain(
			slug,
			targetDomainId,
		);
		if (taken && taken.id !== shortUrl.id) {
			throw new ConflictError(`Slug "${slug}" is already taken on this domain.`);
		}
		return slug;
	}
}

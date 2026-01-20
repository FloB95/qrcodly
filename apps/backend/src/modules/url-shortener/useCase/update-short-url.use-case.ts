import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { BadRequestError, ForbiddenError } from '@/core/error/http';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrl } from '../domain/entities/short-url.entity';
import { TUpdateShortUrlDto } from '@shared/schemas';
import QrCodeRepository from '@/modules/qr-code/domain/repository/qr-code.repository';
import { QrCodeNotFoundError } from '@/modules/qr-code/error/http/qr-code-not-found.error';
import { RedirectLoopError } from '../error/http/redirect-loop.error';
import { buildShortUrl } from '../utils';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';

/**
 * Use case for updating a ShortUrl entity.
 */
@injectable()
export class UpdateShortUrlUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
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
		updatesDto: TUpdateShortUrlDto,
		updatedBy: string,
		linkedQrCodeId?: string,
	): Promise<TShortUrl> {
		// Validate custom domain ownership if changing it
		if (updatesDto.customDomainId !== undefined && updatesDto.customDomainId !== null) {
			await this.validateCustomDomain(updatesDto.customDomainId, updatedBy);
		}

		const updates: Partial<TShortUrl> = {
			...updatesDto,
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
		await this.shortUrlRepository.update(shortUrl, {
			...updates,
			qrCodeId: linkedQrCodeId,
		});

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

	/**
	 * Validates that the custom domain exists, is owned by the user, and is verified.
	 */
	private async validateCustomDomain(customDomainId: string, userId: string): Promise<void> {
		const customDomain = await this.customDomainRepository.findOneById(customDomainId);

		if (!customDomain) {
			throw new BadRequestError('Custom domain not found.');
		}

		if (customDomain.createdBy !== userId) {
			throw new ForbiddenError('You do not own this custom domain.');
		}

		if (customDomain.sslStatus !== 'active') {
			throw new BadRequestError(
				'Custom domain is not verified. Please complete DNS verification first.',
			);
		}
	}
}

import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrl } from '../domain/entities/short-url.entity';
import QrCodeRepository from '@/modules/qr-code/domain/repository/qr-code.repository';
import { QrCodeNotFoundError } from '@/modules/qr-code/error/http/qr-code-not-found.error';
import { RedirectLoopError } from '../error/http/redirect-loop.error';
import { isShortenedDestinationUrl } from '../utils';
import { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import { DestinationUrlSafetyService } from '../service/destination-url-safety.service';
import { ShortUrlBlockedError } from '../error/http/short-url-blocked.error';
import UrlSafetyIncidentRepository from '../domain/repository/url-safety-incident.repository';
import { minutesFromNow } from '@/core/utils/date';
import { URL_SAFETY_FIRST_CHECK_MINUTES } from '../config/constants';
import { safely, shortUrlsUpdated, urlSafetyUnblocks } from '@/core/metrics';

/**
 * Internal input type for updating a short URL.
 * Broader than the API DTO — allows customDomainId for internal flows (QR code strategies).
 */
type UpdateShortUrlInput = {
	destinationUrl?: string | null;
	isActive?: boolean;
	customDomainId?: string | null;
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
		@inject(DestinationUrlSafetyService)
		private destinationUrlSafetyService: DestinationUrlSafetyService,
		@inject(UrlSafetyIncidentRepository)
		private incidentRepository: UrlSafetyIncidentRepository,
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
	): Promise<TShortUrl> {
		// Validate custom domain ownership and readiness if changing it
		if (updatesDto.customDomainId !== undefined && updatesDto.customDomainId !== null) {
			await this.customDomainValidationService.validateForUserUse(
				updatesDto.customDomainId,
				updatedBy,
			);
		}

		const updates: Partial<TShortUrl> = {
			...updatesDto,
			updatedAt: new Date(),
		};

		// refuse a destination that is itself one of our short URLs — a loop when it points back at
		// this code, an unscreened hop that hides the real target when it points at another one
		if (isShortenedDestinationUrl(updatesDto?.destinationUrl)) {
			throw new RedirectLoopError();
		}

		// Requirement: a link we blocked stays off. This is the single choke point — the toggle
		// endpoint, PATCH /:shortCode and the dynamic-QR strategies all reach isActive through here.
		// Pointing the link somewhere else is still allowed; that path re-screens below and lifts the
		// block when the new destination comes back clean.
		const keepsSameDestination =
			updatesDto.destinationUrl === undefined ||
			updatesDto.destinationUrl === shortUrl.destinationUrl;
		if (
			updatesDto.isActive === true &&
			shortUrl.safetyStatus === 'blocked' &&
			keepsSameDestination
		) {
			throw new ShortUrlBlockedError();
		}

		const destinationChanged =
			updatesDto.destinationUrl !== undefined &&
			updatesDto.destinationUrl !== shortUrl.destinationUrl;

		if (destinationChanged) {
			await this.destinationUrlSafetyService.assertDestinationUrlSafe(
				updatesDto.destinationUrl,
				updatedBy,
				'update',
				shortUrl.id,
			);

			// Any new destination re-enters the queue — including a reserved code getting its first one.
			updates.nextSafetyCheckAt = updatesDto.destinationUrl
				? minutesFromNow(URL_SAFETY_FIRST_CHECK_MINUTES)
				: null;

			// The new destination passed screening, so the old block no longer applies. isActive is
			// left alone: the owner switches the link back on deliberately, in a separate action.
			if (shortUrl.safetyStatus === 'blocked') {
				updates.safetyStatus = 'clean';
				updates.safetyBlockedAt = null;
				updates.safetyThreatTypes = null;
				updates.safetyPendingSince = null;
				updates.safetyCheckFailures = 0;
				await this.incidentRepository.resolveForShortUrl(shortUrl.id);
				urlSafetyUnblocks.add(1, { reason: 'destination_changed' });
				this.logger.info('url_safety.unblocked', {
					shortUrlId: shortUrl.id,
					reason: 'destination_changed',
					updatedBy,
				});
			}
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
		safely(() => shortUrlsUpdated.add(1));

		return result!;
	}
}

import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { type TShortUrlWithDomainAndTags } from '../domain/entities/short-url.entity';
import { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import TagRepository from '@/modules/tag/domain/repository/tag.repository';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { shortUrlsCreated, shortUrlsDuplicated } from '@/core/metrics';
import { SHORT_URL_NAME_MAX_LENGTH, buildCopyName } from '@shared/schemas';
import { DestinationUrlSafetyService } from '../service/destination-url-safety.service';
import { ShortUrlBlockedError } from '../error/http/short-url-blocked.error';

@injectable()
export class DuplicateShortUrlUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(CustomDomainValidationService)
		private customDomainValidationService: CustomDomainValidationService,
		@inject(TagRepository) private tagRepository: TagRepository,
		@inject(Logger) private logger: Logger,
		@inject(DestinationUrlSafetyService)
		private destinationUrlSafetyService: DestinationUrlSafetyService,
	) {}

	async execute(
		source: TShortUrlWithDomainAndTags,
		userId: string,
	): Promise<TShortUrlWithDomainAndTags> {
		// Copying a blocked link would hand the user a working clone of something we just disabled.
		if (source.safetyStatus === 'blocked') {
			throw new ShortUrlBlockedError();
		}

		// This use case writes through repository.create() directly, so it never passed the screening
		// that create/update do — a destination that was listed after the original was made could be
		// cloned freely.
		await this.destinationUrlSafetyService.assertDestinationUrlSafe(
			source.destinationUrl,
			userId,
			'duplicate',
			source.id,
		);

		if (source.customDomainId) {
			await this.customDomainValidationService.validateForUserUse(source.customDomainId, userId);
		}

		const result = await UnitOfWork.run<TShortUrlWithDomainAndTags>(async () => {
			const newId = this.shortUrlRepository.generateId();
			const shortCode = await this.shortUrlRepository.generateShortCode();
			const name = buildCopyName(source.name, SHORT_URL_NAME_MAX_LENGTH);

			await this.shortUrlRepository.create({
				id: newId,
				shortCode,
				name,
				destinationUrl: source.destinationUrl,
				qrCodeId: null,
				customDomainId: source.customDomainId,
				isActive: source.isActive,
				createdBy: userId,
				deletedAt: null,
			});

			if (source.tags.length > 0) {
				await this.tagRepository.setShortUrlTags(
					newId,
					source.tags.map((t) => t.id),
				);
			}

			const createdShortUrl = await this.shortUrlRepository.findOneById(newId);
			if (!createdShortUrl) throw new Error('Failed to retrieve duplicated short URL.');

			const tagsMap = await this.tagRepository.findTagsByShortUrlIds([newId]);

			return { ...createdShortUrl, tags: tagsMap.get(newId) ?? [] };
		});

		try {
			this.logger.info('shortUrl.duplicated', {
				shortUrl: { id: result.id, sourceId: source.id, createdBy: userId },
			});
			shortUrlsCreated.add(1);
			shortUrlsDuplicated.add(1);
		} catch (telemetryError) {
			this.logger.warn('shortUrl.duplicated.telemetry.failed', {
				shortUrlId: result.id,
				telemetryError,
			});
		}

		return result;
	}
}

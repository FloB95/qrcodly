import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { type TShortUrlWithDomainAndTags } from '../domain/entities/short-url.entity';
import { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import TagRepository from '@/modules/tag/domain/repository/tag.repository';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { shortUrlsCreated } from '@/core/metrics';
import { SHORT_URL_NAME_MAX_LENGTH, buildCopyName } from '@shared/schemas';

@injectable()
export class DuplicateShortUrlUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(CustomDomainValidationService)
		private customDomainValidationService: CustomDomainValidationService,
		@inject(TagRepository) private tagRepository: TagRepository,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(
		source: TShortUrlWithDomainAndTags,
		userId: string,
	): Promise<TShortUrlWithDomainAndTags> {
		if (source.customDomainId) {
			await this.customDomainValidationService.validateForUserUse(source.customDomainId, userId);
		}

		return await UnitOfWork.run<TShortUrlWithDomainAndTags>(async () => {
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

			this.logger.info('shortUrl.duplicated', {
				shortUrl: { id: newId, sourceId: source.id, createdBy: userId },
			});
			shortUrlsCreated.add(1);

			return { ...createdShortUrl, tags: tagsMap.get(newId) ?? [] };
		});
	}
}

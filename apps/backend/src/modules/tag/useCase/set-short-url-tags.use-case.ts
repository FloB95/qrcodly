import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import TagRepository from '../domain/repository/tag.repository';
import { Logger } from '@/core/logging';
import { type TTag } from '../domain/entities/tag.entity';
import { type TUser } from '@/core/domain/schema/UserSchema';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { BadRequestError, ForbiddenError } from '@/core/error/http';
import { SetShortUrlTagsPolicy } from '../policies/set-short-url-tags.policy';

@injectable()
export class SetShortUrlTagsUseCase implements IBaseUseCase {
	constructor(
		@inject(TagRepository) private tagRepository: TagRepository,
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(shortUrlId: string, tagIds: string[], user: TUser): Promise<TTag[]> {
		// Verify short URL exists and belongs to the authenticated user
		const shortUrl = await this.shortUrlRepository.findOneById(shortUrlId);
		if (!shortUrl) throw new ShortUrlNotFoundError();
		if (shortUrl.createdBy !== user.id) throw new ForbiddenError();

		// Only standalone short URLs (not linked to a QR code) can have tags
		if (shortUrl.qrCodeId != null) {
			throw new BadRequestError(
				'Cannot set tags on a short URL linked to a QR code. Use QR code tags instead.',
			);
		}

		// Verify all tags exist and belong to the authenticated user
		for (const tagId of tagIds) {
			const tag = await this.tagRepository.findOneById(tagId);
			if (!tag || tag.createdBy !== user.id) throw new ForbiddenError();
		}

		// Check plan limits
		const policy = new SetShortUrlTagsPolicy(user, tagIds.length);
		policy.checkAccess();

		await this.tagRepository.setShortUrlTags(shortUrlId, tagIds);
		const tags = await this.tagRepository.findTagsByShortUrlId(shortUrlId);

		this.logger.info('tag.short-url-tags-set', {
			shortUrlTags: {
				shortUrlId,
				tagCount: tagIds.length,
				userId: user.id,
			},
		});

		return tags;
	}
}

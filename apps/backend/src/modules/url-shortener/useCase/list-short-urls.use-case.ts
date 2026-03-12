import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { ISqlQueryFindBy } from '@/core/interface/repository.interface';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrl, TShortUrlWithDomainAndTags } from '../domain/entities/short-url.entity';
import TagRepository from '@/modules/tag/domain/repository/tag.repository';

type ListParams = ISqlQueryFindBy<TShortUrl> & {
	standalone?: boolean;
	tagIds?: string[];
};

type ListResponse = {
	total: number;
	shortUrls: TShortUrlWithDomainAndTags[];
};

/**
 * Use case for listing short URLs based on query parameters.
 */
@injectable()
export class ListShortUrlsUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(TagRepository) private tagRepository: TagRepository,
	) {}

	/**
	 * Executes the use case to retrieve short URLs based on the provided query parameters.
	 * @param params Query parameters including pagination, filters, and standalone flag.
	 * @param userId The ID of the user whose short URLs to list.
	 * @returns An object containing the list of short URLs and the total count.
	 */
	async execute(
		{ limit, page, where, standalone, tagIds }: ListParams,
		userId: string,
	): Promise<ListResponse> {
		const shortUrls = await this.shortUrlRepository.findAllWithDomain({
			limit,
			page,
			where: {
				...where,
				createdBy: { eq: userId },
			},
			standalone,
			tagIds,
		});

		const total = await this.shortUrlRepository.countTotalFiltered(
			{
				...where,
				createdBy: { eq: userId },
			},
			standalone,
			tagIds,
		);

		// Batch-fetch tags for all returned short URLs
		const shortUrlIds = shortUrls.map((su) => su.id);
		const tagsMap = await this.tagRepository.findTagsByShortUrlIds(shortUrlIds);

		const shortUrlsWithTags: TShortUrlWithDomainAndTags[] = shortUrls.map((su) => ({
			...su,
			tags: tagsMap.get(su.id) ?? [],
		}));

		return { shortUrls: shortUrlsWithTags, total };
	}
}

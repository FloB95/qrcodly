import { Get } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { inject, injectable } from 'tsyringe';
import {
	AnalyticsResponseDto,
	type TAnalyticsResponseDto,
	type TGetShortUrlRequestQueryDto,
} from '@shared/schemas';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { type TShortUrlWithDomain } from '@/modules/url-shortener/domain/entities/short-url.entity';
import { GetShortUrlAnalyticsUseCase } from '../../useCase/get-short-url-analytics.use-case';
import { GetShortUrlViewsUseCase } from '../../useCase/get-short-url-views.use-case';

/** Analytics of a short URL. Served under /short-url, since that is the resource they describe. */
@injectable()
export class ShortUrlAnalyticsController extends AbstractController {
	constructor(
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
		@inject(GetShortUrlAnalyticsUseCase)
		private readonly getShortUrlAnalyticsUseCase: GetShortUrlAnalyticsUseCase,
		@inject(GetShortUrlViewsUseCase)
		private readonly getShortUrlViewsUseCase: GetShortUrlViewsUseCase,
	) {
		super();
	}

	@Get('/:shortCode/analytics', {
		responseSchema: {
			200: AnalyticsResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Analytics'],
			summary: 'Get analytics for a short URL',
			description:
				'Returns analytics for a short URL. Every plan gets the aggregate statistics and a summary ' +
				'(last 7 days, top country, top device). The time-series data and the breakdowns by ' +
				'browser, operating system, device type and country require the Pro plan; without it ' +
				'they are null and `detailsLocked` is true. ' +
				'Only the owner can access analytics for their short URLs.',
			operationId: 'short-url/get-analytics',
			params: {
				type: 'object',
				properties: {
					shortCode: { type: 'string', description: 'The 5-character short URL code' },
				},
			},
		},
	})
	async getAnalytics(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TAnalyticsResponseDto>> {
		const shortUrl = await this.fetchOwnedShortUrl(request.params.shortCode, request.user.id);
		const analyticsData = await this.getShortUrlAnalyticsUseCase.execute(
			shortUrl.shortCode,
			request.user.plan,
		);

		return this.makeApiHttpResponse(200, AnalyticsResponseDto.parse(analyticsData));
	}

	@Get('/:shortCode/get-views', {
		config: {
			rateLimitPolicy: RateLimitPolicy.SHORT_URL_VIEWS,
		},
		responseSchema: {
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Analytics'],
			summary: 'Get total views for a short URL',
			description:
				'Returns the total view count for a short URL. Results are cached for 1 hour for performance. ' +
				'Only the owner can access view counts for their short URLs.',
			operationId: 'short-url/get-views',
			params: {
				type: 'object',
				properties: {
					shortCode: { type: 'string', description: 'The 5-character short URL code' },
				},
			},
			response: {
				200: {
					type: 'object',
					properties: {
						views: {
							type: 'number',
							description: 'Total number of pageviews for this short URL',
						},
					},
				},
			},
		},
	})
	async getViews(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<{ views: number }>> {
		const shortUrl = await this.fetchOwnedShortUrl(request.params.shortCode, request.user.id);
		const views = await this.getShortUrlViewsUseCase.execute(shortUrl.shortCode);

		return this.makeApiHttpResponse(200, { views });
	}

	/** Unknown and deleted links are 404, someone else's link is 403 */
	private async fetchOwnedShortUrl(
		shortCode: string,
		userId: string,
	): Promise<TShortUrlWithDomain> {
		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl || shortUrl.deletedAt) {
			throw new ShortUrlNotFoundError();
		}

		this.ensureOwnership(shortUrl, userId);
		return shortUrl;
	}
}

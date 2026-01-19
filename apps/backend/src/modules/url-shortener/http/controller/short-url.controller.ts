import { Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import ShortUrlRepository from '../../domain/repository/short-url.repository';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { ShortUrlNotFoundError } from '../../error/http/short-url-not-found.error';
import {
	AnalyticsResponseDto,
	ShortUrlWithCustomDomainResponseDto,
	TAnalyticsResponseDto,
	TGetShortUrlRequestQueryDto,
	TShortUrlWithCustomDomainResponseDto,
	TUpdateShortUrlDto,
	UpdateShortUrlDto,
} from '@shared/schemas';
import { GetReservedShortCodeUseCase } from '../../useCase/get-reserved-short-url.use-case';
import { UmamiAnalyticsService } from '../../services/umami-analytics.service';
import { UpdateShortUrlUseCase } from '../../useCase/update-short-url.use-case';
import { TShortUrl } from '../../domain/entities/short-url.entity';
import { ForbiddenError } from '@/core/error/http';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';

@injectable()
export class ShortUrlController extends AbstractController {
	constructor(
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
		@inject(GetReservedShortCodeUseCase)
		private readonly getReservedShortCodeUseCase: GetReservedShortCodeUseCase,
		@inject(UpdateShortUrlUseCase)
		private readonly updateShortUrlUseCase: UpdateShortUrlUseCase,
		@inject(UmamiAnalyticsService) private readonly umamiAnalyticsService: UmamiAnalyticsService,
	) {
		super();
	}

	@Get('/:shortCode', {
		authHandler: false,
		schema: {
			hide: true,
		},
	})
	async getOneByShortCode(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto, unknown, false>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode);
		return this.makeApiHttpResponse(200, ShortUrlWithCustomDomainResponseDto.parse(shortUrl));
	}

	@Patch('/:shortCode', {
		responseSchema: {
			200: ShortUrlWithCustomDomainResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Update a short URL',
			description:
				'Updates the active state or the destination URL of the specified short URL. Requires authentication and can only be performed by the owner of the short URL. Returns the updated short URL object.',
			operationId: 'short-url/update-short-url',
		},
	})
	async update(
		request: IHttpRequest<TUpdateShortUrlDto, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		const updateDto = UpdateShortUrlDto.parse(request.body);
		const updatedShortUrl = await this.updateShortUrlUseCase.execute(
			shortUrl,
			updateDto,
			request.user.id,
		);

		return this.makeApiHttpResponse(
			200,
			ShortUrlWithCustomDomainResponseDto.parse(updatedShortUrl),
		);
	}

	@Post('/:shortCode/toggle-active-state', {
		responseSchema: {
			200: ShortUrlWithCustomDomainResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Toggle Short URL Active State',
			description:
				'Activates or deactivates a short URL by toggling its current active state. This endpoint can be used to enable or disable dynamic QR codes associated with the short URL. Returns the updated short URL object.',
			operationId: 'short-url/toggle-active-state',
		},
	})
	async toggleActiveState(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		const updatedShortUrl = await this.updateShortUrlUseCase.execute(
			shortUrl,
			{ isActive: !shortUrl.isActive },
			request.user.id,
		);

		return this.makeApiHttpResponse(
			200,
			ShortUrlWithCustomDomainResponseDto.parse(updatedShortUrl),
		);
	}

	@Get('/reserved', {
		responseSchema: {
			200: ShortUrlWithCustomDomainResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Reserve a short URL',
			description:
				'Generates and reserves a new short URL for the authenticated user. This ensures the short URL is unique and ready for use. Returns the reserved short URL object including its code, target URL (if set), and metadata.',
			operationId: 'short-url/reserve-short-url',
		},
	})
	async reserveShortUrl(
		request: IHttpRequest,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainResponseDto>> {
		const shortUrl = await this.getReservedShortCodeUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, ShortUrlWithCustomDomainResponseDto.parse(shortUrl));
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
			summary: 'Get Analytics for short URL',
			description:
				'Fetches analytics data for the specified short URL, including click counts, visitor statistics, and other tracking information. Requires authentication, and only the owner of the short URL can access its analytics.',
			operationId: 'short-url/get-analytics',
		},
	})
	async getAnalytics(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TAnalyticsResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		const analyticsData = await this.umamiAnalyticsService.getAnalyticsForEndpoint(
			`/u/${shortUrl.shortCode}`,
		);

		return this.makeApiHttpResponse(200, AnalyticsResponseDto.parse(analyticsData));
	}

	@Get('/:shortCode/get-views', {
		responseSchema: {
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Retrieve total views for a short URL',
			description:
				'Fetches the total number of views for the specified short URL. Requires authentication and only the owner of the short URL can access this information.',
			operationId: 'short-url/get-views',
			response: {
				200: {
					type: 'object',
					properties: {
						views: { type: 'number', description: 'Total number of views for the short URL' },
					},
				},
			},
		},
	})
	async getViews(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<{ views: number }>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		const views = await this.umamiAnalyticsService.getViewsForEndpoint(`/u/${shortUrl.shortCode}`);

		return this.makeApiHttpResponse(200, { views });
	}

	// Helper Method
	private async fetchShortUrl(shortCode: string, userId?: string): Promise<TShortUrl> {
		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl) {
			throw new ShortUrlNotFoundError();
		}

		if (userId && shortUrl.createdBy !== userId) {
			throw new ForbiddenError();
		}

		return shortUrl;
	}
}

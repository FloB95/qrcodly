import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import ShortUrlRepository from '../../domain/repository/short-url.repository';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { ShortUrlNotFoundError } from '../../error/http/short-url-not-found.error';
import { BadRequestError } from '@/core/error/http';
import {
	AnalyticsResponseDto,
	CreateShortUrlDto,
	GetShortUrlQueryParamsSchema,
	ShortUrlWithCustomDomainPaginatedResponseDto,
	ShortUrlWithCustomDomainResponseDto,
	TAnalyticsResponseDto,
	TCreateShortUrlDto,
	TGetShortUrlQueryParamsDto,
	TGetShortUrlRequestQueryDto,
	TShortUrlWithCustomDomainPaginatedResponseDto,
	TShortUrlWithCustomDomainResponseDto,
	TTrackScanDto,
	TUpdateShortUrlDto,
	TrackScanDto,
	UpdateShortUrlDto,
} from '@shared/schemas';
import { GetReservedShortCodeUseCase } from '../../useCase/get-reserved-short-url.use-case';
import { UmamiAnalyticsService } from '../../service/umami-analytics.service';
import { UpdateShortUrlUseCase } from '../../useCase/update-short-url.use-case';
import { CreateShortUrlUseCase } from '../../useCase/create-short-url.use-case';
import { ListShortUrlsUseCase } from '../../useCase/list-short-urls.use-case';
import { DeleteShortUrlUseCase } from '../../useCase/delete-short-url.use-case';
import { TShortUrl } from '../../domain/entities/short-url.entity';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import { KeyCache } from '@/core/cache';
import { internalApiAuthHandler } from '@/core/http/middleware/internal-api-auth.middleware';
import { DispatchTrackingEventUseCase } from '@/modules/analytics-integration/useCase/dispatch-tracking-event.use-case';

@injectable()
export class ShortUrlController extends AbstractController {
	constructor(
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
		@inject(GetReservedShortCodeUseCase)
		private readonly getReservedShortCodeUseCase: GetReservedShortCodeUseCase,
		@inject(UpdateShortUrlUseCase)
		private readonly updateShortUrlUseCase: UpdateShortUrlUseCase,
		@inject(CreateShortUrlUseCase)
		private readonly createShortUrlUseCase: CreateShortUrlUseCase,
		@inject(ListShortUrlsUseCase)
		private readonly listShortUrlsUseCase: ListShortUrlsUseCase,
		@inject(DeleteShortUrlUseCase)
		private readonly deleteShortUrlUseCase: DeleteShortUrlUseCase,
		@inject(UmamiAnalyticsService) private readonly umamiAnalyticsService: UmamiAnalyticsService,
		@inject(KeyCache) private readonly keyCache: KeyCache,
		@inject(DispatchTrackingEventUseCase)
		private readonly dispatchTrackingEventUseCase: DispatchTrackingEventUseCase,
	) {
		super();
	}

	private getViewsCacheKey(shortCode: string): string {
		return `views:${shortCode}`;
	}

	@Get('', {
		querySchema: GetShortUrlQueryParamsSchema,
		responseSchema: {
			200: ShortUrlWithCustomDomainPaginatedResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'List short URLs',
			description:
				"Lists the authenticated user's short URLs with pagination and optional filtering. Use standalone=true to only show standalone short URLs (not linked to QR codes).",
			operationId: 'short-url/list-short-urls',
		},
	})
	async list(
		request: IHttpRequest<unknown, unknown, TGetShortUrlQueryParamsDto>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainPaginatedResponseDto>> {
		const { page, limit, where, standalone } = request.query;
		const { shortUrls, total } = await this.listShortUrlsUseCase.execute(
			{ limit, page, where, standalone },
			request.user.id,
		);

		const pagination = {
			page,
			limit,
			total,
			data: shortUrls,
		};

		return this.makeApiHttpResponse(
			200,
			ShortUrlWithCustomDomainPaginatedResponseDto.parse(pagination),
		);
	}

	@Post('', {
		bodySchema: CreateShortUrlDto,
		responseSchema: {
			201: ShortUrlWithCustomDomainResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Create a standalone short URL',
			description:
				'Creates a new standalone short URL (not linked to a QR code). Requires a destination URL. Returns the created short URL object.',
			operationId: 'short-url/create-short-url',
		},
	})
	async create(
		request: IHttpRequest<TCreateShortUrlDto>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainResponseDto>> {
		const shortUrl = await this.createShortUrlUseCase.execute(
			{
				...request.body,
				isActive: true,
			},
			request.user.id,
		);

		return this.makeApiHttpResponse(201, ShortUrlWithCustomDomainResponseDto.parse(shortUrl));
	}

	@Delete('/:shortCode', {
		responseSchema: {
			200: DeleteResponseSchema,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Delete a standalone short URL',
			description:
				'Soft-deletes a standalone short URL. Only standalone short URLs (not linked to QR codes) can be deleted via this endpoint.',
			operationId: 'short-url/delete-short-url',
		},
	})
	async deleteShortUrl(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<{ deleted: boolean }>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		await this.deleteShortUrlUseCase.execute(shortUrl, request.user.id);
		return this.makeApiHttpResponse(200, { deleted: true });
	}

	@Get('/:shortCode/detail', {
		responseSchema: {
			200: ShortUrlWithCustomDomainResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Get short URL details (authenticated)',
			description:
				'Fetches details for a short URL owned by the authenticated user. Only the owner can access this endpoint.',
			operationId: 'short-url/get-short-url-detail',
		},
	})
	async getDetail(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		return this.makeApiHttpResponse(200, ShortUrlWithCustomDomainResponseDto.parse(shortUrl));
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
		bodySchema: UpdateShortUrlDto,
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

		if (shortUrl.qrCodeId != null) {
			throw new BadRequestError(
				'Cannot update a short URL linked to a QR code. Update the QR code instead.',
			);
		}

		const updatedShortUrl = await this.updateShortUrlUseCase.execute(
			shortUrl,
			request.body,
			request.user.id,
		);

		return this.makeApiHttpResponse(
			200,
			ShortUrlWithCustomDomainResponseDto.parse(updatedShortUrl),
		);
	}

	@Patch('/:shortCode/toggle-active-state', {
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

		const cacheKey = this.getViewsCacheKey(shortUrl.shortCode);
		const cached = await this.keyCache.get(cacheKey);
		if (cached !== null) {
			return this.makeApiHttpResponse(200, { views: Number(cached) });
		}

		const views = await this.umamiAnalyticsService.getViewsForEndpoint(`/u/${shortUrl.shortCode}`);
		await this.keyCache.set(cacheKey, views, 3600);

		return this.makeApiHttpResponse(200, { views });
	}

	@Post('/:shortCode/clear-views-cache', {
		authHandler: internalApiAuthHandler,
		schema: { hide: true },
	})
	async clearViewsCache(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto, unknown, false>,
	): Promise<IHttpResponse<{ status: string }>> {
		await this.keyCache.del(this.getViewsCacheKey(request.params.shortCode));
		return this.makeApiHttpResponse(200, { status: 'ok' });
	}

	@Post('/:shortCode/track-scan', {
		authHandler: internalApiAuthHandler,
		bodySchema: TrackScanDto,
		schema: { hide: true },
	})
	async trackScan(
		request: IHttpRequest<TTrackScanDto, TGetShortUrlRequestQueryDto, unknown, false>,
	): Promise<IHttpResponse<{ status: string }>> {
		const shortUrl = await this.shortUrlRepository.findOneByShortCode(request.params.shortCode);
		if (!shortUrl || !shortUrl.createdBy) {
			return this.makeApiHttpResponse(200, { status: 'ok' });
		}

		this.dispatchTrackingEventUseCase.execute({
			userId: shortUrl.createdBy,
			url: request.body.url,
			userAgent: request.body.userAgent,
			hostname: request.body.hostname,
			language: request.body.language,
			referrer: request.body.referrer,
			ip: request.body.ip,
			deviceType: request.body.deviceType,
			browserName: request.body.browserName,
		});

		return this.makeApiHttpResponse(200, { status: 'ok' });
	}

	private async fetchShortUrl(shortCode: string, userId?: string): Promise<TShortUrl> {
		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl || shortUrl.deletedAt) {
			throw new ShortUrlNotFoundError();
		}

		if (userId) {
			this.ensureOwnership(shortUrl, userId);
		}

		return shortUrl;
	}
}

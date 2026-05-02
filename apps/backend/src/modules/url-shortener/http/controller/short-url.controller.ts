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
import TagRepository from '@/modules/tag/domain/repository/tag.repository';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import { shortUrlScans } from '@/core/metrics';
import { DuplicateShortUrlUseCase } from '../../useCase/duplicate-short-url.use-case';

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
		@inject(TagRepository) private readonly tagRepository: TagRepository,
		@inject(DuplicateShortUrlUseCase)
		private readonly duplicateShortUrlUseCase: DuplicateShortUrlUseCase,
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
			tags: ['Short URLs'],
			summary: 'List short URLs',
			description:
				"Returns a paginated list of the authenticated user's short URLs. " +
				'Supports filtering by destination URL, short code, and tags. ' +
				'Set standalone=true to only return short URLs that are not linked to a QR code.',
			operationId: 'short-url/list-short-urls',
		},
	})
	async list(
		request: IHttpRequest<unknown, unknown, TGetShortUrlQueryParamsDto>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainPaginatedResponseDto>> {
		const { page, limit, where, standalone, tagIds } = request.query;
		const { shortUrls, total } = await this.listShortUrlsUseCase.execute(
			{ limit, page, where, standalone, tagIds },
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
			tags: ['Short URLs'],
			summary: 'Create a standalone short URL',
			description:
				'Creates a new standalone short URL (not linked to a QR code). ' +
				'A unique 5-character short code is automatically generated. ' +
				'Optionally assign a custom domain and set the active state.',
			operationId: 'short-url/create-short-url',
		},
	})
	async create(
		request: IHttpRequest<TCreateShortUrlDto>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainResponseDto>> {
		const shortUrl = await this.createShortUrlUseCase.execute(request.body, request.user.id);

		return this.makeApiHttpResponse(
			201,
			ShortUrlWithCustomDomainResponseDto.parse({ ...shortUrl, tags: [] }),
		);
	}

	@Post('/:shortCode/duplicate', {
		responseSchema: {
			201: ShortUrlWithCustomDomainResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Short URLs'],
			summary: 'Duplicate a short URL',
			description:
				'Creates a full copy of an existing standalone short URL with a new short code. ' +
				'Tags are carried over. Only the owner can duplicate their short URLs.',
			operationId: 'short-url/duplicate',
			params: {
				type: 'object',
				properties: {
					shortCode: {
						type: 'string',
						description: 'The 5-character short URL code to duplicate',
					},
				},
			},
		},
	})
	async duplicate(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainResponseDto>> {
		const source = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		const sourceWithDomain = await this.shortUrlRepository.findOneByShortCode(source.shortCode);
		if (!sourceWithDomain) throw new ShortUrlNotFoundError();
		const tags = await this.tagRepository.findTagsByShortUrlId(source.id);
		const duplicated = await this.duplicateShortUrlUseCase.execute(
			{ ...sourceWithDomain, tags },
			request.user.id,
		);
		return this.makeApiHttpResponse(201, ShortUrlWithCustomDomainResponseDto.parse(duplicated));
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
			tags: ['Short URLs'],
			summary: 'Delete a standalone short URL',
			description:
				'Soft-deletes a standalone short URL by its short code. ' +
				'Only standalone short URLs (not linked to QR codes) can be deleted via this endpoint. ' +
				'Short URLs linked to QR codes must be deleted by deleting the QR code.',
			operationId: 'short-url/delete-short-url',
			params: {
				type: 'object',
				properties: {
					shortCode: {
						type: 'string',
						description: 'The 5-character short URL code (e.g. "Ab3xZ")',
					},
				},
			},
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
			tags: ['Short URLs'],
			summary: 'Get short URL details',
			description:
				'Returns the full details of a short URL including its destination, custom domain, active state, and assigned tags. ' +
				'Only the owner can access their short URLs.',
			operationId: 'short-url/get-short-url-detail',
			params: {
				type: 'object',
				properties: {
					shortCode: { type: 'string', description: 'The 5-character short URL code' },
				},
			},
		},
	})
	async getDetail(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TShortUrlWithCustomDomainResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		const tags = await this.tagRepository.findTagsByShortUrlId(shortUrl.id);
		return this.makeApiHttpResponse(
			200,
			ShortUrlWithCustomDomainResponseDto.parse({ ...shortUrl, tags }),
		);
	}

	@Get('/:shortCode', {
		authHandler: internalApiAuthHandler,
		config: {
			rateLimitPolicy: RateLimitPolicy.SCAN_LOOKUP,
		},
		schema: {
			hide: true,
		},
	})
	async getOneByShortCode(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto, unknown, false>,
	): Promise<
		IHttpResponse<{ destinationUrl: string | null; isActive: boolean; deletedAt: Date | null }>
	> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode);
		return this.makeApiHttpResponse(200, {
			destinationUrl: shortUrl.destinationUrl,
			isActive: shortUrl.isActive,
			deletedAt: shortUrl.deletedAt,
		});
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
			tags: ['Short URLs'],
			summary: 'Update a short URL',
			description:
				'Partially updates a standalone short URL. You can change the destination URL, name, or active state. ' +
				'Short URLs linked to a QR code cannot be updated directly — update the QR code instead.',
			operationId: 'short-url/update-short-url',
			params: {
				type: 'object',
				properties: {
					shortCode: { type: 'string', description: 'The 5-character short URL code' },
				},
			},
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

		const tags = await this.tagRepository.findTagsByShortUrlId(updatedShortUrl.id);
		return this.makeApiHttpResponse(
			200,
			ShortUrlWithCustomDomainResponseDto.parse({ ...updatedShortUrl, tags }),
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
			tags: ['Short URLs'],
			summary: 'Toggle short URL active state',
			description:
				'Flips the active/inactive state of a short URL. When inactive, the short URL stops redirecting visitors. ' +
				'This also affects dynamic QR codes linked to this short URL.',
			operationId: 'short-url/toggle-active-state',
			params: {
				type: 'object',
				properties: {
					shortCode: { type: 'string', description: 'The 5-character short URL code' },
				},
			},
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

		const tags = await this.tagRepository.findTagsByShortUrlId(updatedShortUrl.id);
		return this.makeApiHttpResponse(
			200,
			ShortUrlWithCustomDomainResponseDto.parse({ ...updatedShortUrl, tags }),
		);
	}

	@Get('/reserved', {
		responseSchema: {
			200: ShortUrlWithCustomDomainResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Short URLs'],
			summary: 'Reserve a short URL code',
			description:
				'Generates and reserves a unique 5-character short code for the authenticated user. ' +
				'The reserved code can later be used when creating a QR code or short URL. ' +
				'Useful for pre-allocating codes before the destination URL is known.',
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
			tags: ['Analytics'],
			summary: 'Get analytics for a short URL',
			description:
				'Returns detailed analytics for a short URL: pageviews, unique visitors, sessions, bounce rate, ' +
				'time-series data, and breakdowns by browser, operating system, device type, and country. ' +
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

	@Post('/:shortCode/record-scan', {
		authHandler: internalApiAuthHandler,
		bodySchema: TrackScanDto,
		config: {
			rateLimitPolicy: RateLimitPolicy.SCAN_RECORD,
		},
		schema: { hide: true },
	})
	async recordScan(
		request: IHttpRequest<TTrackScanDto, TGetShortUrlRequestQueryDto, unknown, false>,
	): Promise<IHttpResponse<{ status: string }>> {
		const { shortCode } = request.params;
		const body = request.body;

		shortUrlScans.add(1);

		// 1. Clear views cache
		void this.keyCache.del(this.getViewsCacheKey(shortCode));

		// 2. Send to Umami
		void this.umamiAnalyticsService.sendEvent({
			url: body.url,
			userAgent: body.userAgent,
			hostname: body.hostname,
			language: body.language,
			referrer: body.referrer,
			screen: body.screen,
			deviceType: body.deviceType,
			browserName: body.browserName,
			ip: body.ip,
		});

		// 3. Dispatch to user analytics integrations (GA4, Matomo)
		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (shortUrl?.createdBy) {
			this.dispatchTrackingEventUseCase.execute({
				userId: shortUrl.createdBy,
				url: body.url,
				userAgent: body.userAgent,
				hostname: body.hostname,
				language: body.language,
				referrer: body.referrer,
				ip: body.ip,
				deviceType: body.deviceType,
				browserName: body.browserName,
			});
		}

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

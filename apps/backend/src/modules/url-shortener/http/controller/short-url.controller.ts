import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import ShortUrlRepository from '../../domain/repository/short-url.repository';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { ShortUrlNotFoundError } from '../../error/http/short-url-not-found.error';
import { BadRequestError } from '@/core/error/http';
import {
	AcknowledgeSafetyIncidentsResponseDto,
	AnalyticsResponseDto,
	CreateShortUrlDto,
	GetShortUrlQueryParamsSchema,
	ReservedShortUrlResponseDto,
	SafetyIncidentListResponseDto,
	TAcknowledgeSafetyIncidentsResponseDto,
	TSafetyIncidentListResponseDto,
	ShortUrlWithCustomDomainPaginatedResponseDto,
	ShortUrlWithCustomDomainResponseDto,
	TAnalyticsResponseDto,
	TCreateShortUrlDto,
	TGetShortUrlQueryParamsDto,
	TGetShortUrlRequestQueryDto,
	TReservedShortUrlResponseDto,
	TShortUrlWithCustomDomainPaginatedResponseDto,
	TShortUrlWithCustomDomainResponseDto,
	TTrackScanDto,
	TUpdateShortUrlDto,
	TrackScanDto,
	UpdateShortUrlDto,
} from '@shared/schemas';
import { GetReservedShortCodeUseCase } from '../../useCase/get-reserved-short-url.use-case';
import { buildShortUrl } from '../../utils';
import { HOT_SHORT_CODES_KEY } from '../../config/constants';
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
import { Logger } from '@/core/logging';
import { ShortUrlBlockedError } from '../../error/http/short-url-blocked.error';
import UrlSafetyIncidentRepository from '../../domain/repository/url-safety-incident.repository';
import UserSafetyStandingRepository from '../../domain/repository/user-safety-standing.repository';
import { daysAgo } from '@/core/utils/date';
import {
	URL_SAFETY_HOT_SHORT_CODE_LIMIT,
	URL_SAFETY_OFFENCE_WINDOW_DAYS,
} from '../../config/constants';

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
		@inject(Logger) private readonly logger: Logger,
		@inject(UrlSafetyIncidentRepository)
		private readonly safetyIncidentRepository: UrlSafetyIncidentRepository,
		@inject(UserSafetyStandingRepository)
		private readonly safetyStandingRepository: UserSafetyStandingRepository,
	) {
		super();
	}

	private getViewsCacheKey(shortCode: string): string {
		return `views:${shortCode}`;
	}

	@Get('/safety-incidents', {
		responseSchema: {
			200: SafetyIncidentListResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Short URLs'],
			summary: 'List open URL safety findings',
			description:
				'Returns the safety findings the user has not dismissed yet, together with how many of ' +
				'their links are currently blocked and whether the account has already been warned. ' +
				'Only the flagged hostname is exposed, never the full destination URL.',
			operationId: 'short-url/list-safety-incidents',
		},
	})
	async listSafetyIncidents(
		request: IHttpRequest,
	): Promise<IHttpResponse<TSafetyIncidentListResponseDto>> {
		const userId = request.user.id;
		const [incidents, blocked, standing] = await Promise.all([
			this.safetyIncidentRepository.findOpenForUser(userId),
			this.shortUrlRepository.countBlockedForUser(userId),
			this.safetyStandingRepository.findOneById(userId),
		]);

		const warningWindowStart = daysAgo(URL_SAFETY_OFFENCE_WINDOW_DAYS);
		const warningActive =
			standing?.warnedAt != null &&
			standing.lastOffenceAt != null &&
			standing.lastOffenceAt >= warningWindowStart;

		return this.makeApiHttpResponse(
			200,
			SafetyIncidentListResponseDto.parse({
				incidents,
				blockedCount: blocked.total,
				blockedStandaloneCount: blocked.standalone,
				blockedQrCodeCount: blocked.qrLinked,
				warningActive,
			}),
		);
	}

	@Post('/safety-incidents/acknowledge', {
		responseSchema: {
			200: AcknowledgeSafetyIncidentsResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Short URLs'],
			summary: 'Dismiss URL safety findings',
			description:
				'Marks all of the current open safety findings as seen so the dashboard banner stops ' +
				'showing them. The block itself is unaffected.',
			operationId: 'short-url/acknowledge-safety-incidents',
		},
	})
	async acknowledgeSafetyIncidents(
		request: IHttpRequest,
	): Promise<IHttpResponse<TAcknowledgeSafetyIncidentsResponseDto>> {
		const acknowledged = await this.safetyIncidentRepository.acknowledgeAllForUser(request.user.id);
		return this.makeApiHttpResponse(
			200,
			AcknowledgeSafetyIncidentsResponseDto.parse({ acknowledged }),
		);
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
		const { page, limit, where, standalone, tagIds, status } = request.query;
		const { shortUrls, total } = await this.listShortUrlsUseCase.execute(
			{ limit, page, where, standalone, tagIds, status },
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
		IHttpResponse<{
			destinationUrl: string | null;
			isActive: boolean;
			deletedAt: Date | null;
			blocked: boolean;
		}>
	> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode);
		return this.makeApiHttpResponse(200, {
			destinationUrl: shortUrl.destinationUrl,
			isActive: shortUrl.isActive,
			deletedAt: shortUrl.deletedAt,
			// lets the frontend middleware send a scanner to /link-blocked instead of /disabled —
			// telling a phishing victim to "contact the owner of this QR code" is bad advice
			blocked: shortUrl.safetyStatus === 'blocked',
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

		// UpdateShortUrlUseCase enforces this too — refusing here just avoids doing the work first
		if (!shortUrl.isActive && shortUrl.safetyStatus === 'blocked') {
			throw new ShortUrlBlockedError();
		}

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
			200: ReservedShortUrlResponseDto,
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
	): Promise<IHttpResponse<TReservedShortUrlResponseDto>> {
		const shortUrl = await this.getReservedShortCodeUseCase.execute(request.user.id);
		const fullShortUrl = buildShortUrl(shortUrl.shortCode, shortUrl.customDomain?.domain ?? null);
		return this.makeApiHttpResponse(
			200,
			ReservedShortUrlResponseDto.parse({ ...shortUrl, shortUrl: fullShortUrl }),
		);
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

		// Logged per scan so the scan count can be broken down by client in Axiom — the
		// forwarded user agent only exists in the body here, never on the request itself.
		this.logger.info('short_url.scan', {
			shortCode,
			userAgent: body.userAgent,
			browserName: body.browserName,
			deviceType: body.deviceType,
			referrer: body.referrer,
		});

		// 1. Clear views cache
		void this.keyCache.del(this.getViewsCacheKey(shortCode));

		// Traffic signal for the safety re-check tiering. Real view counts live in Umami, and querying
		// it per link from a nightly job would be unaffordable, so the hot set is the cheap proxy: a
		// sorted set bumped here (no DB write on the scan path) and trimmed by the job.
		void this.bumpHotShortCode(shortCode);

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

	private async bumpHotShortCode(shortCode: string): Promise<void> {
		try {
			const client = this.keyCache.getClient();
			await client.zincrby(HOT_SHORT_CODES_KEY, 1, shortCode);
			// keep the set from growing without bound if the job never trims it
			await client.zremrangebyrank(HOT_SHORT_CODES_KEY, 0, -(URL_SAFETY_HOT_SHORT_CODE_LIMIT + 1));
		} catch (error) {
			// a missing traffic hint only costs precision in the re-check tiering — never fail a scan
			this.logger.debug('url_safety.hot_set_bump_failed', { shortCode, error: error as Error });
		}
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

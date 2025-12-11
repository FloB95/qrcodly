import { Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest, type IHttpRequestWithAuth } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import ShortUrlRepository from '../../domain/repository/short-url.repository';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { ShortUrlNotFoundError } from '../../error/http/short-url-not-found.error';
import {
	AnalyticsResponseDto,
	ShortUrlResponseDto,
	TAnalyticsResponseDto,
	TGetShortUrlRequestQueryDto,
	TShortUrlResponseDto,
	TUpdateShortUrlDto,
	UpdateShortUrlDto,
} from '@shared/schemas';
import { GetReservedShortCodeUseCase } from '../../useCase/get-reserved-short-url.use-case';
import { UmamiAnalyticsService } from '../../services/umami-analytics.service';
import { UpdateShortUrlUseCase } from '../../useCase/update-short-url.use-case';
import { TShortUrl } from '../../domain/entities/short-url.entity';
import { UnauthorizedError } from '@/core/error/http';

@injectable()
export class ShortUrlController extends AbstractController {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(GetReservedShortCodeUseCase)
		private getReservedShortCodeUseCase: GetReservedShortCodeUseCase,
		@inject(UpdateShortUrlUseCase)
		private updateShortUrlUseCase: UpdateShortUrlUseCase,
		@inject(UmamiAnalyticsService) private umamiAnalyticsService: UmamiAnalyticsService,
	) {
		super();
	}

	@Get('/:shortCode', { skipAuth: true })
	async getOneByShortCode(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TShortUrlResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode);
		return this.makeApiHttpResponse(200, ShortUrlResponseDto.parse(shortUrl));
	}

	@Post('/:shortCode')
	async update(
		request: IHttpRequestWithAuth<TUpdateShortUrlDto, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TShortUrlResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		const updateDto = UpdateShortUrlDto.parse(request.body);
		const updatedShortUrl = await this.updateShortUrlUseCase.execute(
			shortUrl,
			updateDto,
			request.user.id,
		);

		return this.makeApiHttpResponse(200, ShortUrlResponseDto.parse(updatedShortUrl));
	}

	@Post('/:shortCode/toggle-active-state')
	async toggleActiveState(
		request: IHttpRequestWithAuth<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TShortUrlResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		const updatedShortUrl = await this.updateShortUrlUseCase.execute(
			shortUrl,
			{ isActive: !shortUrl.isActive },
			request.user.id,
		);

		return this.makeApiHttpResponse(200, ShortUrlResponseDto.parse(updatedShortUrl));
	}

	@Get('/reserved')
	async reserveShortUrl(
		request: IHttpRequestWithAuth,
	): Promise<IHttpResponse<TShortUrlResponseDto>> {
		const shortUrl = await this.getReservedShortCodeUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, ShortUrlResponseDto.parse(shortUrl));
	}

	@Get('/:shortCode/analytics')
	async getAnalytics(
		request: IHttpRequestWithAuth<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TAnalyticsResponseDto>> {
		const shortUrl = await this.fetchShortUrl(request.params.shortCode, request.user.id);
		const analyticsData = await this.umamiAnalyticsService.getAnalyticsForEndpoint(
			`/u/${shortUrl.shortCode}`,
		);

		return this.makeApiHttpResponse(200, AnalyticsResponseDto.parse(analyticsData));
	}

	@Get('/:shortCode/get-views')
	async getViews(
		request: IHttpRequestWithAuth<unknown, TGetShortUrlRequestQueryDto>,
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
			throw new UnauthorizedError();
		}

		return shortUrl;
	}
}

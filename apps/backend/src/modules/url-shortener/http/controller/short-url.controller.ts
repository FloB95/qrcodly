import { Get } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest, type IHttpRequestWithAuth } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import ShortUrlRepository from '../../domain/repository/short-url.repository';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { ShortUrlNotFoundError } from '../../error/http/qr-code-not-found.error';
import {
	AnalyticsResponseDto,
	ShortUrlResponseDto,
	TAnalyticsResponseDto,
	TGetShortUrlRequestQueryDto,
	TShortUrlResponseDto,
} from '@shared/schemas';
import { GetReservedShortCodeUseCase } from '../../useCase/get-reserved-short-url.use-case';
import { UmamiAnalyticsService } from '../../services/umami-analytics.service';
import { SHORT_BASE_URL } from '../../config/constants';

@injectable()
export class ShortUrlController extends AbstractController {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(GetReservedShortCodeUseCase)
		private getReservedShortCodeUseCase: GetReservedShortCodeUseCase,
		@inject(UmamiAnalyticsService) private umamiAnalyticsService: UmamiAnalyticsService,
	) {
		super();
	}

	@Get('/:shortCode', { skipAuth: true })
	async getOneByShortCode(
		request: IHttpRequest<unknown, TGetShortUrlRequestQueryDto>,
	): Promise<IHttpResponse<TShortUrlResponseDto>> {
		const { shortCode } = request.params;

		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl) {
			throw new ShortUrlNotFoundError();
		}

		return this.makeApiHttpResponse(200, ShortUrlResponseDto.parse(shortUrl));
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
		// TODO add redis cache if growing
		const { shortCode } = request.params;

		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl) {
			throw new ShortUrlNotFoundError();
		}

		const data = await this.umamiAnalyticsService.getAnalyticsForEndpoint(
			SHORT_BASE_URL + shortCode,
		);

		return this.makeApiHttpResponse(200, AnalyticsResponseDto.parse(data));
	}

	@Get('/:shortCode/get-views')
	async getViews(request: IHttpRequestWithAuth<unknown, TGetShortUrlRequestQueryDto>): Promise<
		IHttpResponse<{
			views: number;
		}>
	> {
		// TODO add redis cache if growing
		const { shortCode } = request.params;

		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl) {
			throw new ShortUrlNotFoundError();
		}

		const data = await this.umamiAnalyticsService.getViewsForEndpoint(SHORT_BASE_URL + shortCode);

		return this.makeApiHttpResponse(200, { views: data });
	}
}

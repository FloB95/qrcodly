import { Get } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest, type IHttpRequestWithAuth } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import ShortUrlRepository from '../../domain/repository/short-url.repository';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { ShortUrlNotFoundError } from '../../error/http/qr-code-not-found.error';
import {
	ShortUrlResponseDto,
	TGetShortUrlRequestQueryDto,
	TShortUrlResponseDto,
} from '@shared/schemas';
import { GetReservedShortCodeUseCase } from '../../useCase/get-reserved-short-url.use-case';
import { PostHogAnalyticsService } from '../../services/post-hog-analytics.service';

@injectable()
export class ShortUrlController extends AbstractController {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(GetReservedShortCodeUseCase)
		private getReservedShortCodeUseCase: GetReservedShortCodeUseCase,
		@inject(PostHogAnalyticsService) private postHogAnalyticsService: PostHogAnalyticsService,
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
	): Promise<IHttpResponse> {
		const { shortCode } = request.params;

		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl) {
			throw new ShortUrlNotFoundError();
		}

		const data = await this.postHogAnalyticsService.getAnalyticsForUrlCode(shortUrl.shortCode);

		return this.makeApiHttpResponse(200, data);
	}
}

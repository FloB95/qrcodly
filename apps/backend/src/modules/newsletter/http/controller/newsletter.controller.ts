import { inject, injectable } from 'tsyringe';
import {
	NewsletterSubscriptionResponseDto,
	UpdateNewsletterSubscriptionDto,
	type TNewsletterSubscriptionResponseDto,
	type TUpdateNewsletterSubscriptionDto,
} from '@shared/schemas';
import { Get, Put } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { GetNewsletterSubscriptionUseCase } from '../../useCase/get-newsletter-subscription.use-case';
import { UpdateNewsletterSubscriptionUseCase } from '../../useCase/update-newsletter-subscription.use-case';

@injectable()
export class NewsletterController extends AbstractController {
	constructor(
		@inject(GetNewsletterSubscriptionUseCase)
		private readonly getSubscriptionUseCase: GetNewsletterSubscriptionUseCase,
		@inject(UpdateNewsletterSubscriptionUseCase)
		private readonly updateSubscriptionUseCase: UpdateNewsletterSubscriptionUseCase,
	) {
		super();
	}

	@Get('/subscription', {
		responseSchema: {
			200: NewsletterSubscriptionResponseDto,
		},
		schema: {
			hide: true,
		},
	})
	async getSubscription(
		request: IHttpRequest,
	): Promise<IHttpResponse<TNewsletterSubscriptionResponseDto>> {
		const result = await this.getSubscriptionUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, result);
	}

	@Put('/subscription', {
		bodySchema: UpdateNewsletterSubscriptionDto,
		responseSchema: {
			200: NewsletterSubscriptionResponseDto,
		},
		schema: {
			hide: true,
		},
	})
	async updateSubscription(
		request: IHttpRequest<TUpdateNewsletterSubscriptionDto>,
	): Promise<IHttpResponse<TNewsletterSubscriptionResponseDto>> {
		const result = await this.updateSubscriptionUseCase.execute(request.user.id, request.body);
		return this.makeApiHttpResponse(200, result);
	}
}

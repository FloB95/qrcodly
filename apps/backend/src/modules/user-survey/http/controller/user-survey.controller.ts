import { Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { inject, injectable } from 'tsyringe';
import { SubmitSurveyUseCase } from '../../useCase/submit-survey.use-case';
import UserSurveyRepository from '../../domain/repository/user-survey.repository';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { type IHttpRequest } from '@/core/interface/request.interface';
import {
	SubmitUserSurveyDto,
	UserSurveyStatusResponseDto,
	type TSubmitUserSurveyDto,
	type TUserSurveyStatusResponseDto,
} from '@shared/schemas';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';

@injectable()
export class UserSurveyController extends AbstractController {
	constructor(
		@inject(SubmitSurveyUseCase) private readonly submitSurveyUseCase: SubmitSurveyUseCase,
		@inject(UserSurveyRepository) private readonly userSurveyRepository: UserSurveyRepository,
	) {
		super();
	}

	@Get('/status', {
		responseSchema: {
			200: UserSurveyStatusResponseDto,
		},
		schema: {
			hide: true,
		},
	})
	async getStatus(request: IHttpRequest): Promise<IHttpResponse<TUserSurveyStatusResponseDto>> {
		const existing = await this.userSurveyRepository.findByUserId(request.user.id);
		return this.makeApiHttpResponse(200, { hasResponded: !!existing });
	}

	@Post('', {
		bodySchema: SubmitUserSurveyDto,
		responseSchema: {
			201: UserSurveyStatusResponseDto,
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.SURVEY_SUBMIT,
		},
		schema: {
			hide: true,
		},
	})
	async submit(
		request: IHttpRequest<TSubmitUserSurveyDto>,
	): Promise<IHttpResponse<TUserSurveyStatusResponseDto>> {
		await this.submitSurveyUseCase.execute(request.body, request.user.id);
		return this.makeApiHttpResponse(201, { hasResponded: true });
	}
}

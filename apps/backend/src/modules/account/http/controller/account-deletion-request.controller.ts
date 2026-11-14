import { inject, injectable } from 'tsyringe';
import { Delete, Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import {
	AccountDeletionRequestResponseDto,
	type TAccountDeletionRequestResponseDto,
} from '@shared/schemas';
import AccountDeletionRequestRepository from '../../domain/repository/account-deletion-request.repository';
import { RequestAccountDeletionUseCase } from '../../useCase/request-account-deletion.use-case';
import { RevokeAccountDeletionUseCase } from '../../useCase/revoke-account-deletion.use-case';

const ROUTE_OPTIONS = {
	responseSchema: { 200: AccountDeletionRequestResponseDto },
	schema: { hide: true },
} as const;

// Dashboard only: a deletion request must come from the signed-in owner, never from an API key.
const SESSION_ONLY = { allowedTokenTypes: ['session_token' as const] };

@injectable()
export class AccountDeletionRequestController extends AbstractController {
	constructor(
		@inject(AccountDeletionRequestRepository)
		private readonly repository: AccountDeletionRequestRepository,
		@inject(RequestAccountDeletionUseCase)
		private readonly requestUseCase: RequestAccountDeletionUseCase,
		@inject(RevokeAccountDeletionUseCase)
		private readonly revokeUseCase: RevokeAccountDeletionUseCase,
	) {
		super();
	}

	@Get('', { ...ROUTE_OPTIONS, config: SESSION_ONLY })
	async getStatus(
		request: IHttpRequest,
	): Promise<IHttpResponse<TAccountDeletionRequestResponseDto>> {
		const open = await this.repository.findActiveByUserId(request.user.id);
		return this.makeApiHttpResponse(200, {
			requestedAt: open?.requestedAt.toISOString() ?? null,
		});
	}

	@Post('', {
		...ROUTE_OPTIONS,
		config: { ...SESSION_ONLY, rateLimitPolicy: RateLimitPolicy.ACCOUNT_DELETION_REQUEST },
	})
	async request(request: IHttpRequest): Promise<IHttpResponse<TAccountDeletionRequestResponseDto>> {
		const requestedAt = await this.requestUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, { requestedAt: requestedAt.toISOString() });
	}

	@Delete('', {
		...ROUTE_OPTIONS,
		config: { ...SESSION_ONLY, rateLimitPolicy: RateLimitPolicy.ACCOUNT_DELETION_REQUEST },
	})
	async revoke(request: IHttpRequest): Promise<IHttpResponse<TAccountDeletionRequestResponseDto>> {
		await this.revokeUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, { requestedAt: null });
	}
}

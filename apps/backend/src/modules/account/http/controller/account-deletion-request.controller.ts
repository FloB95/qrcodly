import { inject, injectable } from 'tsyringe';
import { Delete, Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import {
	AccountDeletionRequestResponseDto,
	ConfirmAccountDeletionDto,
	type TAccountDeletionRequestResponseDto,
	type TConfirmAccountDeletionDto,
} from '@shared/schemas';
import { type TAccountDeletionRequest } from '../../domain/entities/account-deletion-request.entity';
import { ConfirmAccountDeletionUseCase } from '../../useCase/confirm-account-deletion.use-case';
import AccountDeletionRequestRepository from '../../domain/repository/account-deletion-request.repository';
import { RequestAccountDeletionUseCase } from '../../useCase/request-account-deletion.use-case';
import { RevokeAccountDeletionUseCase } from '../../useCase/revoke-account-deletion.use-case';

const ROUTE_OPTIONS = {
	responseSchema: { 200: AccountDeletionRequestResponseDto },
	schema: { hide: true },
} as const;

// Dashboard only: a deletion request must come from the signed-in owner, never from an API key.
const SESSION_ONLY = { allowedTokenTypes: ['session_token' as const] };

const toResponse = (request?: TAccountDeletionRequest): TAccountDeletionRequestResponseDto => ({
	requestedAt: request?.requestedAt.toISOString() ?? null,
	confirmedAt: request?.confirmedAt?.toISOString() ?? null,
});

@injectable()
export class AccountDeletionRequestController extends AbstractController {
	constructor(
		@inject(AccountDeletionRequestRepository)
		private readonly repository: AccountDeletionRequestRepository,
		@inject(RequestAccountDeletionUseCase)
		private readonly requestUseCase: RequestAccountDeletionUseCase,
		@inject(RevokeAccountDeletionUseCase)
		private readonly revokeUseCase: RevokeAccountDeletionUseCase,
		@inject(ConfirmAccountDeletionUseCase)
		private readonly confirmUseCase: ConfirmAccountDeletionUseCase,
	) {
		super();
	}

	@Get('', { ...ROUTE_OPTIONS, config: SESSION_ONLY })
	async getStatus(
		request: IHttpRequest,
	): Promise<IHttpResponse<TAccountDeletionRequestResponseDto>> {
		const open = await this.repository.findActiveByUserId(request.user.id);
		return this.makeApiHttpResponse(200, toResponse(open));
	}

	@Post('', {
		...ROUTE_OPTIONS,
		config: {
			...SESSION_ONLY,
			rateLimitPolicy: RateLimitPolicy.ACCOUNT_DELETION_REQUEST,
			allowedDuringAccountDeletion: true,
		},
	})
	async request(request: IHttpRequest): Promise<IHttpResponse<TAccountDeletionRequestResponseDto>> {
		const open = await this.requestUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, toResponse(open));
	}

	// No session needed: the link proves access to the account's mailbox and may be opened on
	// another device. A POST, so a mail scanner that merely fetches the link confirms nothing.
	@Post('/confirm', {
		...ROUTE_OPTIONS,
		authHandler: false,
		bodySchema: ConfirmAccountDeletionDto,
		config: {
			rateLimitPolicy: RateLimitPolicy.ACCOUNT_DELETION_CONFIRM,
			allowedDuringAccountDeletion: true,
		},
	})
	async confirm(
		request: IHttpRequest<TConfirmAccountDeletionDto>,
	): Promise<IHttpResponse<TAccountDeletionRequestResponseDto>> {
		const confirmed = await this.confirmUseCase.execute(request.body.token);
		return this.makeApiHttpResponse(200, toResponse(confirmed));
	}

	@Delete('', {
		...ROUTE_OPTIONS,
		config: { ...SESSION_ONLY, rateLimitPolicy: RateLimitPolicy.ACCOUNT_DELETION_REQUEST },
	})
	async revoke(request: IHttpRequest): Promise<IHttpResponse<TAccountDeletionRequestResponseDto>> {
		await this.revokeUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, toResponse());
	}
}

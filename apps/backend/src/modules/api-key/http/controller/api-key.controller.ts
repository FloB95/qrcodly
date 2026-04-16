import { inject, injectable } from 'tsyringe';
import { Delete, Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import {
	ApiKeyListResponseDto,
	CreateApiKeyDto,
	CreateApiKeyResponseDto,
	type TApiKeyListResponseDto,
	type TCreateApiKeyDto,
	type TCreateApiKeyResponseDto,
	type TIdRequestQueryDto,
} from '@shared/schemas';
import { CreateApiKeyUseCase } from '../../useCase/create-api-key.use-case';
import { ListApiKeysUseCase } from '../../useCase/list-api-keys.use-case';
import { RevokeApiKeyUseCase } from '../../useCase/revoke-api-key.use-case';

@injectable()
export class ApiKeyController extends AbstractController {
	constructor(
		@inject(CreateApiKeyUseCase) private readonly createApiKeyUseCase: CreateApiKeyUseCase,
		@inject(ListApiKeysUseCase) private readonly listApiKeysUseCase: ListApiKeysUseCase,
		@inject(RevokeApiKeyUseCase) private readonly revokeApiKeyUseCase: RevokeApiKeyUseCase,
	) {
		super();
	}

	@Get('', {
		responseSchema: {
			200: ApiKeyListResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['API Keys'],
			summary: 'List API keys',
			description:
				'Returns all active API keys owned by the authenticated user. Secrets are never returned here — only at creation time.',
			operationId: 'api-key/list',
		},
	})
	async list(
		request: IHttpRequest<unknown, unknown, unknown>,
	): Promise<IHttpResponse<TApiKeyListResponseDto>> {
		const data = await this.listApiKeysUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, ApiKeyListResponseDto.parse({ data }));
	}

	@Post('', {
		bodySchema: CreateApiKeyDto,
		responseSchema: {
			201: CreateApiKeyResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['API Keys'],
			summary: 'Create an API key',
			description:
				'Creates a new personal API key for the authenticated user. The plaintext secret is returned only once in this response — store it securely. Requires a Pro plan.',
			operationId: 'api-key/create',
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.TAG_CREATE,
		},
	})
	async create(
		request: IHttpRequest<TCreateApiKeyDto>,
	): Promise<IHttpResponse<TCreateApiKeyResponseDto>> {
		const apiKey = await this.createApiKeyUseCase.execute(
			request.body,
			request.user.id,
			request.user.plan,
		);
		return this.makeApiHttpResponse(201, CreateApiKeyResponseDto.parse(apiKey));
	}

	@Delete('/:id', {
		responseSchema: {
			200: DeleteResponseSchema,
			401: DEFAULT_ERROR_RESPONSES[401],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['API Keys'],
			summary: 'Revoke an API key',
			description:
				'Revokes an API key. Any future requests authenticated with this key will be rejected.',
			operationId: 'api-key/revoke',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Clerk API key ID' },
				},
			},
		},
	})
	async revoke(request: IHttpRequest<unknown, TIdRequestQueryDto>) {
		await this.revokeApiKeyUseCase.execute(request.params.id, request.user.id);
		return this.makeApiHttpResponse(200, { deleted: true });
	}
}

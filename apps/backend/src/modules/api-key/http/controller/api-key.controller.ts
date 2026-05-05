import { inject, injectable } from 'tsyringe';
import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import {
	ApiKeyListResponseDto,
	ApiKeyResponseDto,
	CreateApiKeyDto,
	CreateApiKeyResponseDto,
	UpdateApiKeyDto,
	type TApiKeyListResponseDto,
	type TApiKeyResponseDto,
	type TCreateApiKeyDto,
	type TCreateApiKeyResponseDto,
	type TIdRequestQueryDto,
	type TUpdateApiKeyDto,
} from '@shared/schemas';
import { CreateApiKeyUseCase } from '../../useCase/create-api-key.use-case';
import { ListApiKeysUseCase } from '../../useCase/list-api-keys.use-case';
import { RevokeApiKeyUseCase } from '../../useCase/revoke-api-key.use-case';
import { UpdateApiKeyUseCase } from '../../useCase/update-api-key.use-case';

@injectable()
export class ApiKeyController extends AbstractController {
	constructor(
		@inject(CreateApiKeyUseCase) private readonly createApiKeyUseCase: CreateApiKeyUseCase,
		@inject(ListApiKeysUseCase) private readonly listApiKeysUseCase: ListApiKeysUseCase,
		@inject(RevokeApiKeyUseCase) private readonly revokeApiKeyUseCase: RevokeApiKeyUseCase,
		@inject(UpdateApiKeyUseCase) private readonly updateApiKeyUseCase: UpdateApiKeyUseCase,
	) {
		super();
	}

	@Get('', {
		responseSchema: {
			200: ApiKeyListResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			tags: ['API Keys'],
			summary: 'List API keys',
			description:
				'Returns all active API keys owned by the authenticated user. Secrets are never returned here — only at creation time. Session-token only.',
			operationId: 'api-key/list',
		},
		config: {
			allowedTokenTypes: ['session_token'],
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
			hide: true,
			tags: ['API Keys'],
			summary: 'Create an API key',
			description:
				'Creates a new personal API key for the authenticated user. The plaintext secret is returned only once in this response — store it securely. Requires a Pro plan. Session-token only.',
			operationId: 'api-key/create',
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.TAG_CREATE,
			allowedTokenTypes: ['session_token'],
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

	@Patch('/:id', {
		bodySchema: UpdateApiKeyDto,
		responseSchema: {
			200: ApiKeyResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			tags: ['API Keys'],
			summary: 'Update an API key',
			description:
				'Updates the description, scopes, or expiration of an existing API key. The plaintext secret cannot be re-issued. Session-token only.',
			operationId: 'api-key/update',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Clerk API key ID' },
				},
			},
		},
		config: {
			allowedTokenTypes: ['session_token'],
		},
	})
	async update(
		request: IHttpRequest<TUpdateApiKeyDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TApiKeyResponseDto>> {
		const apiKey = await this.updateApiKeyUseCase.execute(
			request.params.id,
			request.body,
			request.user.id,
		);
		return this.makeApiHttpResponse(200, ApiKeyResponseDto.parse(apiKey));
	}

	@Delete('/:id', {
		responseSchema: {
			200: DeleteResponseSchema,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			tags: ['API Keys'],
			summary: 'Revoke an API key',
			description:
				'Revokes an API key. Any future requests authenticated with this key will be rejected. Session-token only.',
			operationId: 'api-key/revoke',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Clerk API key ID' },
				},
			},
		},
		config: {
			allowedTokenTypes: ['session_token'],
		},
	})
	async revoke(request: IHttpRequest<unknown, TIdRequestQueryDto>) {
		await this.revokeApiKeyUseCase.execute(request.params.id, request.user.id);
		return this.makeApiHttpResponse(200, { deleted: true });
	}
}

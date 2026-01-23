import { Delete, Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { ForbiddenError } from '@/core/error/http';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import {
	CreateCustomDomainDto,
	CustomDomainResponseDto,
	CustomDomainListResponseDto,
	SetupInstructionsResponseDto,
	ResolveDomainResponseDto,
	ResolveDomainQueryDto,
	type TCreateCustomDomainDto,
	type TCustomDomainResponseDto,
	type TCustomDomainIdParamsDto,
	type TCustomDomainListQueryDto,
	type TCustomDomainListResponseDto,
	type TSetupInstructionsResponseDto,
	type TResolveDomainResponseDto,
	type TResolveDomainQueryDto,
	CustomDomainIdParamsDto,
	CustomDomainListQueryDto,
} from '@shared/schemas';
import { CreateCustomDomainUseCase } from '../../useCase/create-custom-domain.use-case';
import { VerifyCustomDomainUseCase } from '../../useCase/verify-custom-domain.use-case';
import { DeleteCustomDomainUseCase } from '../../useCase/delete-custom-domain.use-case';
import { ListCustomDomainsUseCase } from '../../useCase/list-custom-domains.use-case';
import { GetCustomDomainUseCase } from '../../useCase/get-custom-domain.use-case';
import { SetDefaultCustomDomainUseCase } from '../../useCase/set-default-custom-domain.use-case';
import { ClearDefaultCustomDomainUseCase } from '../../useCase/clear-default-custom-domain.use-case';
import { GetDefaultCustomDomainUseCase } from '../../useCase/get-default-custom-domain.use-case';
import { ResolveCustomDomainUseCase } from '../../useCase/resolve-custom-domain.use-case';
import { GetSetupInstructionsUseCase } from '../../useCase/get-setup-instructions.use-case';
import { TCustomDomain } from '../../domain/entities/custom-domain.entity';
import { z } from 'zod';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';

@injectable()
export class CustomDomainController extends AbstractController {
	constructor(
		@inject(CreateCustomDomainUseCase)
		private readonly createCustomDomainUseCase: CreateCustomDomainUseCase,
		@inject(VerifyCustomDomainUseCase)
		private readonly verifyCustomDomainUseCase: VerifyCustomDomainUseCase,
		@inject(DeleteCustomDomainUseCase)
		private readonly deleteCustomDomainUseCase: DeleteCustomDomainUseCase,
		@inject(ListCustomDomainsUseCase)
		private readonly listCustomDomainsUseCase: ListCustomDomainsUseCase,
		@inject(GetCustomDomainUseCase)
		private readonly getCustomDomainUseCase: GetCustomDomainUseCase,
		@inject(SetDefaultCustomDomainUseCase)
		private readonly setDefaultCustomDomainUseCase: SetDefaultCustomDomainUseCase,
		@inject(ClearDefaultCustomDomainUseCase)
		private readonly clearDefaultCustomDomainUseCase: ClearDefaultCustomDomainUseCase,
		@inject(GetDefaultCustomDomainUseCase)
		private readonly getDefaultCustomDomainUseCase: GetDefaultCustomDomainUseCase,
		@inject(ResolveCustomDomainUseCase)
		private readonly resolveCustomDomainUseCase: ResolveCustomDomainUseCase,
		@inject(GetSetupInstructionsUseCase)
		private readonly getSetupInstructionsUseCase: GetSetupInstructionsUseCase,
	) {
		super();
	}

	@Get('', {
		querySchema: CustomDomainListQueryDto,
		responseSchema: {
			200: CustomDomainListResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'List custom domains',
			description: 'Lists all custom domains for the authenticated user with pagination support.',
			operationId: 'custom-domain/list',
		},
	})
	async list(
		request: IHttpRequest<unknown, unknown, TCustomDomainListQueryDto>,
	): Promise<IHttpResponse<TCustomDomainListResponseDto>> {
		const query = CustomDomainListQueryDto.parse(request.query);
		const result = await this.listCustomDomainsUseCase.execute(
			request.user.id,
			query.page,
			query.limit,
		);
		// Map each domain to the response DTO format
		const mappedData = result.data.map((domain) => this.mapToResponseDto(domain));
		return this.makeApiHttpResponse(200, {
			data: mappedData,
			pagination: result.pagination,
		});
	}

	@Get('/resolve', {
		authHandler: false,
		querySchema: ResolveDomainQueryDto,
		responseSchema: {
			200: ResolveDomainResponseDto,
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.DOMAIN_RESOLVE,
		},
		schema: {
			hide: true,
			summary: 'Resolve a custom domain',
			description:
				'Public endpoint for Cloudflare Worker to validate if a domain is registered, enabled, and has active SSL. Returns domain validity status.',
			operationId: 'custom-domain/resolve',
		},
	})
	async resolve(
		request: IHttpRequest<unknown, unknown, TResolveDomainQueryDto, false>,
	): Promise<IHttpResponse<TResolveDomainResponseDto>> {
		const query = ResolveDomainQueryDto.parse(request.query);
		const result = await this.resolveCustomDomainUseCase.execute(query.domain);
		return this.makeApiHttpResponse(200, ResolveDomainResponseDto.parse(result));
	}

	@Get('/default', {
		responseSchema: {
			200: CustomDomainResponseDto.nullable(),
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Get default domain',
			description:
				"Returns the user's default custom domain for dynamic QR codes, or null if no default is set.",
			operationId: 'custom-domain/get-default',
		},
	})
	async getDefault(request: IHttpRequest): Promise<IHttpResponse<TCustomDomainResponseDto | null>> {
		const result = await this.getDefaultCustomDomainUseCase.execute(request.user.id);
		if (!result) {
			return this.makeApiHttpResponse(200, null);
		}
		return this.makeApiHttpResponse(200, this.mapToResponseDto(result));
	}

	@Post('', {
		bodySchema: CreateCustomDomainDto,
		responseSchema: {
			201: CustomDomainResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Add a custom domain',
			description:
				'Adds a new subdomain for the authenticated user. Only subdomains are supported (e.g., links.example.com). The domain is registered with Cloudflare and must be verified via DNS records before it can be used.',
			operationId: 'custom-domain/create',
		},
	})
	async create(
		request: IHttpRequest<TCreateCustomDomainDto>,
	): Promise<IHttpResponse<TCustomDomainResponseDto>> {
		const dto = CreateCustomDomainDto.parse(request.body);
		const customDomain = await this.createCustomDomainUseCase.execute(dto, request.user);
		return this.makeApiHttpResponse(201, this.mapToResponseDto(customDomain));
	}

	@Get('/:id', {
		responseSchema: {
			200: CustomDomainResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Get a custom domain',
			description: 'Retrieves a custom domain by ID. Only the owner can access their domains.',
			operationId: 'custom-domain/get',
		},
	})
	async getOne(
		request: IHttpRequest<unknown, TCustomDomainIdParamsDto>,
	): Promise<IHttpResponse<TCustomDomainResponseDto>> {
		const params = CustomDomainIdParamsDto.parse(request.params);
		const customDomain = await this.fetchCustomDomain(params.id, request.user.id);
		return this.makeApiHttpResponse(200, this.mapToResponseDto(customDomain));
	}

	@Post('/:id/verify', {
		responseSchema: {
			200: CustomDomainResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.DOMAIN_VERIFY,
		},
		schema: {
			hide: true,
			summary: 'Check domain verification status',
			description:
				'Polls Cloudflare for the current verification status. Returns updated SSL and ownership status.',
			operationId: 'custom-domain/verify',
		},
	})
	async verify(
		request: IHttpRequest<unknown, TCustomDomainIdParamsDto>,
	): Promise<IHttpResponse<TCustomDomainResponseDto>> {
		const params = CustomDomainIdParamsDto.parse(request.params);
		const customDomain = await this.fetchCustomDomain(params.id, request.user.id);
		const verifiedDomain = await this.verifyCustomDomainUseCase.execute(customDomain);
		return this.makeApiHttpResponse(200, this.mapToResponseDto(verifiedDomain));
	}

	@Get('/:id/setup-instructions', {
		responseSchema: {
			200: SetupInstructionsResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Get DNS setup instructions',
			description:
				'Returns the DNS records required for domain verification. Phase 1 shows ownership TXT and CNAME records. Phase 2 shows Cloudflare SSL TXT record.',
			operationId: 'custom-domain/setup-instructions',
		},
	})
	async getSetupInstructions(
		request: IHttpRequest<unknown, TCustomDomainIdParamsDto>,
	): Promise<IHttpResponse<TSetupInstructionsResponseDto>> {
		const params = CustomDomainIdParamsDto.parse(request.params);
		const customDomain = await this.fetchCustomDomain(params.id, request.user.id);
		const instructions = this.getSetupInstructionsUseCase.execute(customDomain);
		return this.makeApiHttpResponse(200, SetupInstructionsResponseDto.parse(instructions));
	}

	@Post('/:id/set-default', {
		responseSchema: {
			200: CustomDomainResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Set as default domain',
			description:
				'Sets this domain as the default for all new dynamic QR codes. The domain must have active SSL status before it can be set as default.',
			operationId: 'custom-domain/set-default',
		},
	})
	async setDefault(
		request: IHttpRequest<unknown, TCustomDomainIdParamsDto>,
	): Promise<IHttpResponse<TCustomDomainResponseDto>> {
		const params = CustomDomainIdParamsDto.parse(request.params);
		const customDomain = await this.fetchCustomDomain(params.id, request.user.id);
		const updatedDomain = await this.setDefaultCustomDomainUseCase.execute(
			customDomain,
			request.user.id,
		);
		return this.makeApiHttpResponse(200, this.mapToResponseDto(updatedDomain));
	}

	@Post('/clear-default', {
		responseSchema: {
			200: z.object({ success: z.boolean() }),
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Clear default domain',
			description:
				'Removes the default domain setting. New dynamic QR codes will use the system default domain.',
			operationId: 'custom-domain/clear-default',
		},
	})
	async clearDefault(request: IHttpRequest): Promise<IHttpResponse<{ success: boolean }>> {
		await this.clearDefaultCustomDomainUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, { success: true });
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
			summary: 'Delete a custom domain',
			description:
				'Deletes a custom domain. Short URLs using this domain will fall back to the default domain.',
			operationId: 'custom-domain/delete',
		},
	})
	async delete(request: IHttpRequest<unknown, TCustomDomainIdParamsDto>) {
		const params = CustomDomainIdParamsDto.parse(request.params);
		const customDomain = await this.fetchCustomDomain(params.id, request.user.id);
		await this.deleteCustomDomainUseCase.execute(customDomain);
		return this.makeApiHttpResponse(200, { deleted: true });
	}

	// Helper Methods
	private async fetchCustomDomain(id: string, userId: string): Promise<TCustomDomain> {
		const customDomain = await this.getCustomDomainUseCase.execute(id);

		if (customDomain.createdBy !== userId) {
			throw new ForbiddenError();
		}

		return customDomain;
	}

	/**
	 * Maps a database entity to the response DTO format.
	 */
	private mapToResponseDto(customDomain: TCustomDomain): TCustomDomainResponseDto {
		// Parse validation errors from JSON string
		let validationErrors: string[] | null = null;
		if (customDomain.validationErrors) {
			try {
				validationErrors = JSON.parse(customDomain.validationErrors) as string[];
			} catch {
				validationErrors = null;
			}
		}

		return CustomDomainResponseDto.parse({
			id: customDomain.id,
			domain: customDomain.domain,
			isDefault: customDomain.isDefault,
			isEnabled: customDomain.isEnabled,
			createdBy: customDomain.createdBy,
			createdAt: customDomain.createdAt,
			updatedAt: customDomain.updatedAt,
			// Two-phase verification fields
			verificationPhase: customDomain.verificationPhase || 'dns_verification',
			ownershipTxtVerified: customDomain.ownershipTxtVerified ?? false,
			cnameVerified: customDomain.cnameVerified ?? false,
			// Cloudflare fields
			cloudflareHostnameId: customDomain.cloudflareHostnameId,
			sslStatus: customDomain.sslStatus,
			ownershipStatus: customDomain.ownershipStatus,
			sslValidationRecord:
				customDomain.sslValidationTxtName && customDomain.sslValidationTxtValue
					? {
							name: customDomain.sslValidationTxtName,
							value: customDomain.sslValidationTxtValue,
						}
					: null,
			ownershipValidationRecord:
				customDomain.ownershipValidationTxtName && customDomain.ownershipValidationTxtValue
					? {
							name: customDomain.ownershipValidationTxtName,
							value: customDomain.ownershipValidationTxtValue,
						}
					: null,
			validationErrors,
		});
	}
}

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
	type TCreateCustomDomainDto,
	type TCustomDomainResponseDto,
	type TCustomDomainIdParamsDto,
	type TCustomDomainListQueryDto,
	type TCustomDomainListResponseDto,
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
import { VerifyCnameUseCase } from '../../useCase/verify-cname.use-case';
import { DnsVerificationService } from '../../service/dns-verification.service';
import { TCustomDomain } from '../../domain/entities/custom-domain.entity';
import { z } from 'zod';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';

// Response schema for verification instructions
const VerificationInstructionsResponseDto = z.object({
	recordType: z.string(),
	recordHost: z.string(),
	recordValue: z.string(),
	instructions: z.string(),
});

type TVerificationInstructionsResponseDto = z.infer<typeof VerificationInstructionsResponseDto>;

// Response schema for full setup instructions (TXT + CNAME)
const FullSetupInstructionsResponseDto = z.object({
	txtRecord: z.object({
		recordType: z.string(),
		recordHost: z.string(),
		recordValue: z.string(),
	}),
	cnameRecord: z.object({
		recordType: z.string(),
		recordHost: z.string(),
		recordValue: z.string(),
	}),
	instructions: z.string(),
});

type TFullSetupInstructionsResponseDto = z.infer<typeof FullSetupInstructionsResponseDto>;

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
		@inject(VerifyCnameUseCase)
		private readonly verifyCnameUseCase: VerifyCnameUseCase,
		@inject(DnsVerificationService)
		private readonly dnsVerificationService: DnsVerificationService,
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
		return this.makeApiHttpResponse(200, CustomDomainListResponseDto.parse(result));
	}

	@Get('/default', {
		responseSchema: {
			200: CustomDomainResponseDto.nullable(),
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
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
		return this.makeApiHttpResponse(200, CustomDomainResponseDto.parse(result));
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
			summary: 'Add a custom domain',
			description:
				'Adds a new custom domain for the authenticated user. The domain must be verified via DNS TXT record before it can be used.',
			operationId: 'custom-domain/create',
		},
	})
	async create(
		request: IHttpRequest<TCreateCustomDomainDto>,
	): Promise<IHttpResponse<TCustomDomainResponseDto>> {
		const dto = CreateCustomDomainDto.parse(request.body);
		const customDomain = await this.createCustomDomainUseCase.execute(dto, request.user);
		return this.makeApiHttpResponse(201, CustomDomainResponseDto.parse(customDomain));
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
		return this.makeApiHttpResponse(200, CustomDomainResponseDto.parse(customDomain));
	}

	@Get('/:id/verification-instructions', {
		responseSchema: {
			200: VerificationInstructionsResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Get verification instructions',
			description: 'Returns the DNS TXT record instructions for verifying domain ownership.',
			operationId: 'custom-domain/verification-instructions',
		},
	})
	async getVerificationInstructions(
		request: IHttpRequest<unknown, TCustomDomainIdParamsDto>,
	): Promise<IHttpResponse<TVerificationInstructionsResponseDto>> {
		const params = CustomDomainIdParamsDto.parse(request.params);
		const customDomain = await this.fetchCustomDomain(params.id, request.user.id);
		const instructions = this.dnsVerificationService.getVerificationInstructions(
			customDomain.domain,
			customDomain.verificationToken,
		);
		return this.makeApiHttpResponse(200, VerificationInstructionsResponseDto.parse(instructions));
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
		schema: {
			summary: 'Verify a custom domain (TXT record)',
			description:
				'Verifies domain ownership by checking for the DNS TXT record. The record must contain the verification token provided during domain creation.',
			operationId: 'custom-domain/verify',
		},
	})
	async verify(
		request: IHttpRequest<unknown, TCustomDomainIdParamsDto>,
	): Promise<IHttpResponse<TCustomDomainResponseDto>> {
		const params = CustomDomainIdParamsDto.parse(request.params);
		const customDomain = await this.fetchCustomDomain(params.id, request.user.id);
		const verifiedDomain = await this.verifyCustomDomainUseCase.execute(customDomain);
		return this.makeApiHttpResponse(200, CustomDomainResponseDto.parse(verifiedDomain));
	}

	@Post('/:id/verify-cname', {
		responseSchema: {
			200: CustomDomainResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Verify CNAME record',
			description:
				'Verifies that the domain has a valid CNAME record pointing to our servers. This is required for the domain to be used for dynamic QR codes.',
			operationId: 'custom-domain/verify-cname',
		},
	})
	async verifyCname(
		request: IHttpRequest<unknown, TCustomDomainIdParamsDto>,
	): Promise<IHttpResponse<TCustomDomainResponseDto>> {
		const params = CustomDomainIdParamsDto.parse(request.params);
		const customDomain = await this.fetchCustomDomain(params.id, request.user.id);
		const verifiedDomain = await this.verifyCnameUseCase.execute(customDomain);
		return this.makeApiHttpResponse(200, CustomDomainResponseDto.parse(verifiedDomain));
	}

	@Get('/:id/setup-instructions', {
		responseSchema: {
			200: FullSetupInstructionsResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Get full setup instructions',
			description:
				'Returns complete DNS setup instructions including both TXT record (for verification) and CNAME record (for routing).',
			operationId: 'custom-domain/setup-instructions',
		},
	})
	async getSetupInstructions(
		request: IHttpRequest<unknown, TCustomDomainIdParamsDto>,
	): Promise<IHttpResponse<TFullSetupInstructionsResponseDto>> {
		const params = CustomDomainIdParamsDto.parse(request.params);
		const customDomain = await this.fetchCustomDomain(params.id, request.user.id);
		const instructions = this.dnsVerificationService.getFullSetupInstructions(
			customDomain.domain,
			customDomain.verificationToken,
		);
		return this.makeApiHttpResponse(200, FullSetupInstructionsResponseDto.parse(instructions));
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
			summary: 'Set as default domain',
			description:
				'Sets this domain as the default for all new dynamic QR codes. The domain must be fully verified (TXT and CNAME) before it can be set as default.',
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
		return this.makeApiHttpResponse(200, CustomDomainResponseDto.parse(updatedDomain));
	}

	@Post('/clear-default', {
		responseSchema: {
			200: z.object({ success: z.boolean() }),
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
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

	// Helper Method
	private async fetchCustomDomain(id: string, userId: string): Promise<TCustomDomain> {
		const customDomain = await this.getCustomDomainUseCase.execute(id);

		if (customDomain.createdBy !== userId) {
			throw new ForbiddenError();
		}

		return customDomain;
	}
}

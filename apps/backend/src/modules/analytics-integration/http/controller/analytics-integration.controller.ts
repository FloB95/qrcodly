import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import { CredentialEncryptionService } from '../../service/credential-encryption.service';
import {
	CreateAnalyticsIntegrationDto,
	UpdateAnalyticsIntegrationDto,
	AnalyticsIntegrationResponseDto,
	AnalyticsIntegrationListResponseDto,
	AnalyticsIntegrationIdParamsDto,
	type TCreateAnalyticsIntegrationDto,
	type TUpdateAnalyticsIntegrationDto,
	type TAnalyticsIntegrationIdParamsDto,
	type TAnalyticsIntegrationResponseDto,
	type TAnalyticsIntegrationListResponseDto,
} from '@shared/schemas';
import { z } from 'zod';
import { CreateAnalyticsIntegrationUseCase } from '../../useCase/create-analytics-integration.use-case';
import { UpdateAnalyticsIntegrationUseCase } from '../../useCase/update-analytics-integration.use-case';
import { DeleteAnalyticsIntegrationUseCase } from '../../useCase/delete-analytics-integration.use-case';
import { ListAnalyticsIntegrationsUseCase } from '../../useCase/list-analytics-integrations.use-case';
import { TestAnalyticsIntegrationUseCase } from '../../useCase/test-analytics-integration.use-case';
import { AnalyticsIntegrationNotFoundError } from '../../error';
import { type TAnalyticsIntegration } from '../../domain/entities/analytics-integration.entity';
import AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { PlanName } from '@/core/config/plan.config';

@injectable()
export class AnalyticsIntegrationController extends AbstractController {
	constructor(
		@inject(CreateAnalyticsIntegrationUseCase)
		private readonly createUseCase: CreateAnalyticsIntegrationUseCase,
		@inject(UpdateAnalyticsIntegrationUseCase)
		private readonly updateUseCase: UpdateAnalyticsIntegrationUseCase,
		@inject(DeleteAnalyticsIntegrationUseCase)
		private readonly deleteUseCase: DeleteAnalyticsIntegrationUseCase,
		@inject(ListAnalyticsIntegrationsUseCase)
		private readonly listUseCase: ListAnalyticsIntegrationsUseCase,
		@inject(TestAnalyticsIntegrationUseCase)
		private readonly testUseCase: TestAnalyticsIntegrationUseCase,
		@inject(AnalyticsIntegrationRepository)
		private readonly repository: AnalyticsIntegrationRepository,
		@inject(CredentialEncryptionService)
		private readonly encryptionService: CredentialEncryptionService,
	) {
		super();
	}

	@Get('', {
		responseSchema: {
			200: AnalyticsIntegrationListResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'List analytics integrations',
			description: 'Lists all analytics integrations for the authenticated user.',
			operationId: 'analytics-integration/list',
		},
	})
	async list(request: IHttpRequest): Promise<IHttpResponse<TAnalyticsIntegrationListResponseDto>> {
		const integrations = await this.listUseCase.execute(request.user.id);
		const mapped = integrations.map((i) => this.mapToResponseDto(i));
		return this.makeApiHttpResponse(200, AnalyticsIntegrationListResponseDto.parse(mapped));
	}

	@Post('', {
		bodySchema: CreateAnalyticsIntegrationDto,
		responseSchema: {
			201: AnalyticsIntegrationResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Create an analytics integration',
			description: 'Creates a new analytics integration for the authenticated user (pro only).',
			operationId: 'analytics-integration/create',
		},
	})
	async create(
		request: IHttpRequest<TCreateAnalyticsIntegrationDto>,
	): Promise<IHttpResponse<TAnalyticsIntegrationResponseDto>> {
		const dto = CreateAnalyticsIntegrationDto.parse(request.body);
		const integration = await this.createUseCase.execute(dto, request.user);
		return this.makeApiHttpResponse(201, this.mapToResponseDto(integration));
	}

	@Patch('/:id', {
		bodySchema: UpdateAnalyticsIntegrationDto,
		responseSchema: {
			200: AnalyticsIntegrationResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Update an analytics integration',
			description: 'Updates credentials, settings, or enabled state of an analytics integration.',
			operationId: 'analytics-integration/update',
		},
	})
	async update(
		request: IHttpRequest<TUpdateAnalyticsIntegrationDto, TAnalyticsIntegrationIdParamsDto>,
	): Promise<IHttpResponse<TAnalyticsIntegrationResponseDto>> {
		const params = AnalyticsIntegrationIdParamsDto.parse(request.params);
		const dto = UpdateAnalyticsIntegrationDto.parse(request.body);
		const integration = await this.fetchIntegration(params.id, request.user.id);
		this.ensureProPlan(request.user.plan);
		const updated = await this.updateUseCase.execute(integration, dto);
		return this.makeApiHttpResponse(200, this.mapToResponseDto(updated));
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
			summary: 'Delete an analytics integration',
			description: 'Removes an analytics integration.',
			operationId: 'analytics-integration/delete',
		},
	})
	async delete(request: IHttpRequest<unknown, TAnalyticsIntegrationIdParamsDto>) {
		const params = AnalyticsIntegrationIdParamsDto.parse(request.params);
		const integration = await this.fetchIntegration(params.id, request.user.id);
		await this.deleteUseCase.execute(integration);
		return this.makeApiHttpResponse(200, { deleted: true });
	}

	@Post('/:id/test', {
		responseSchema: {
			200: z.object({ valid: z.boolean() }),
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Test analytics integration credentials',
			description: 'Validates the stored credentials against the analytics provider.',
			operationId: 'analytics-integration/test',
		},
	})
	async test(
		request: IHttpRequest<unknown, TAnalyticsIntegrationIdParamsDto>,
	): Promise<IHttpResponse<{ valid: boolean }>> {
		const params = AnalyticsIntegrationIdParamsDto.parse(request.params);
		const integration = await this.fetchIntegration(params.id, request.user.id);
		this.ensureProPlan(request.user.plan);
		const result = await this.testUseCase.execute(integration);
		return this.makeApiHttpResponse(200, result);
	}

	private ensureProPlan(plan: PlanName): void {
		if (plan !== PlanName.PRO) {
			throw new PlanLimitExceededError('analytics integration', 0);
		}
	}

	private async fetchIntegration(id: string, userId: string): Promise<TAnalyticsIntegration> {
		const integration = await this.repository.findOneById(id);
		if (!integration) {
			throw new AnalyticsIntegrationNotFoundError();
		}
		this.ensureOwnership(integration, userId);
		return integration;
	}

	private mapToResponseDto(integration: TAnalyticsIntegration): TAnalyticsIntegrationResponseDto {
		let displayIdentifier: string | null = null;
		try {
			const credentials = this.encryptionService.decrypt(
				integration.encryptedCredentials,
				integration.encryptionIv,
				integration.encryptionTag,
			);
			if (integration.providerType === 'google_analytics') {
				displayIdentifier = (credentials.measurementId as string) ?? null;
			} else if (integration.providerType === 'matomo') {
				const url = credentials.matomoUrl as string;
				const siteId = credentials.siteId as string;
				displayIdentifier = url && siteId ? `${url} (Site ${siteId})` : null;
			}
		} catch {
			displayIdentifier = null;
		}

		return AnalyticsIntegrationResponseDto.parse({
			id: integration.id,
			providerType: integration.providerType,
			isEnabled: integration.isEnabled,
			hasCredentials: !!integration.encryptedCredentials,
			displayIdentifier,
			lastError: integration.lastError,
			lastErrorAt: integration.lastErrorAt,
			consecutiveFailures: integration.consecutiveFailures,
			createdBy: integration.createdBy,
			createdAt: integration.createdAt,
			updatedAt: integration.updatedAt,
		});
	}
}

import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { inject, injectable } from 'tsyringe';
import { DeleteConfigTemplateUseCase } from '../../useCase/delete-config-template.use-case';
import { CreateConfigTemplateUseCase } from '../../useCase/create-config-template.use-case';
import { ListConfigTemplatesUseCase } from '../../useCase/list-config-templates.use-case';
import { UpdateConfigTemplateUseCase } from '../../useCase/update-config-template.use-case';
import { ConfigTemplateNotFoundError } from '../../error/http/config-template-not-found.error';
import { type IHttpResponse } from '@/core/interface/response.interface';
import {
	ConfigTemplatePaginatedResponseDto,
	ConfigTemplateResponseDto,
	CreateConfigTemplateDto,
	GetConfigTemplateQueryParamsDto,
	TConfigTemplatePaginatedResponseDto,
	TConfigTemplateResponseDto,
	TCreateConfigTemplateDto,
	TGetConfigTemplateQueryParamsDto,
	TIdRequestQueryDto,
	TUpdateConfigTemplateDto,
	UpdateConfigTemplateDto,
} from '@shared/schemas';
import { GetConfigTemplateUseCase } from '../../useCase/get-config-template.use-case';
import { type TConfigTemplate } from '../../domain/entities/config-template.entity';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import { type IHttpRequest } from '@/core/interface/request.interface';

@injectable()
export class ConfigTemplateController extends AbstractController {
	constructor(
		@inject(GetConfigTemplateUseCase)
		private readonly getConfigTemplateUseCase: GetConfigTemplateUseCase,
		@inject(ListConfigTemplatesUseCase)
		private readonly listConfigTemplatesUseCase: ListConfigTemplatesUseCase,
		@inject(CreateConfigTemplateUseCase)
		private readonly createConfigTemplateUseCase: CreateConfigTemplateUseCase,
		@inject(UpdateConfigTemplateUseCase)
		private readonly updateConfigTemplateUseCase: UpdateConfigTemplateUseCase,
		@inject(DeleteConfigTemplateUseCase)
		private readonly deleteConfigTemplateUseCase: DeleteConfigTemplateUseCase,
	) {
		super();
	}

	@Get('', {
		querySchema: GetConfigTemplateQueryParamsDto,
		responseSchema: {
			200: ConfigTemplatePaginatedResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Templates'],
			summary: 'List templates',
			description:
				'Returns a paginated list of QR code styling templates created by the authenticated user. ' +
				'Supports filtering by name and creation date.',
			operationId: 'template/list-templates',
		},
	})
	async list(
		request: IHttpRequest<unknown, unknown, TGetConfigTemplateQueryParamsDto>,
	): Promise<IHttpResponse<TConfigTemplatePaginatedResponseDto>> {
		const { page, limit, where } = request.query;
		const { configTemplates, total } = await this.listConfigTemplatesUseCase.execute({
			limit,
			page,
			where: {
				...where,
				createdBy: {
					eq: request.user.id,
				},
			},
		});

		const pagination = {
			page: page,
			limit: limit,
			total,
			data: configTemplates,
		};

		return this.makeApiHttpResponse(200, ConfigTemplatePaginatedResponseDto.parse(pagination));
	}

	@Get('/predefined', {
		authHandler: false,
		responseSchema: {
			200: ConfigTemplatePaginatedResponseDto,
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Templates', 'Public'],
			summary: 'List predefined templates',
			description:
				'Returns a list of system-provided QR code styling templates available to all users. ' +
				'No authentication required. Useful as starting points for custom designs.',
			operationId: 'template/list-predefined-templates',
		},
	})
	async getPredefined(): Promise<IHttpResponse<TConfigTemplatePaginatedResponseDto>> {
		const page = 1;
		const limit = 10;
		const { configTemplates, total } = await this.listConfigTemplatesUseCase.execute({
			limit,
			page,
			where: {
				isPredefined: {
					eq: true,
				},
			},
		});

		const pagination = {
			page: page,
			limit: limit,
			total,
			data: configTemplates,
		};

		return this.makeApiHttpResponse(200, ConfigTemplatePaginatedResponseDto.parse(pagination));
	}

	@Post('', {
		bodySchema: CreateConfigTemplateDto,
		responseSchema: {
			200: ConfigTemplateResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.TEMPLATE_CREATE,
		},
		schema: {
			tags: ['Templates'],
			summary: 'Create a template',
			description:
				'Saves a QR code styling configuration as a reusable template with a name. ' +
				'Templates store colors, dot styles, corner styles, margins, and embedded images.',
			operationId: 'template/create-template',
		},
	})
	async create(
		request: IHttpRequest<TCreateConfigTemplateDto>,
	): Promise<IHttpResponse<TConfigTemplateResponseDto>> {
		const configTemplate = await this.createConfigTemplateUseCase.execute(
			request.body,
			request.user.id,
		);
		return this.makeApiHttpResponse(201, ConfigTemplateResponseDto.parse(configTemplate));
	}

	@Get('/:id', {
		responseSchema: {
			200: ConfigTemplateResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Templates'],
			summary: 'Get template by ID',
			description:
				'Returns a single template with its full styling configuration. Only the owner can access their templates.',
			operationId: 'template/get-template-by-id',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'Template UUID' },
				},
			},
		},
	})
	async getOneById(
		request: IHttpRequest<unknown, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TConfigTemplateResponseDto>> {
		const configTemplate = await this.fetchOwnedTemplate(request.params.id, request.user.id, true);
		return this.makeApiHttpResponse(200, ConfigTemplateResponseDto.parse(configTemplate));
	}

	@Patch('/:id', {
		bodySchema: UpdateConfigTemplateDto,
		responseSchema: {
			200: ConfigTemplateResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Templates'],
			summary: 'Update a template',
			description:
				'Partially updates a template name and/or styling configuration. Only the owner can update their templates.',
			operationId: 'template/update-template-by-id',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'Template UUID' },
				},
			},
		},
	})
	async update(
		request: IHttpRequest<TUpdateConfigTemplateDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TConfigTemplateResponseDto>> {
		const configTemplate = await this.fetchOwnedTemplate(request.params.id, request.user.id);

		const updatedTemplate = await this.updateConfigTemplateUseCase.execute(
			configTemplate,
			request.body,
			request.user.id,
		);

		return this.makeApiHttpResponse(200, ConfigTemplateResponseDto.parse(updatedTemplate));
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
			tags: ['Templates'],
			summary: 'Delete a template',
			description:
				'Permanently deletes a QR code styling template. Only the owner can delete their templates.',
			operationId: 'template/delete-template-id',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'Template UUID' },
				},
			},
		},
	})
	async deleteOneById(request: IHttpRequest<unknown, TIdRequestQueryDto>) {
		const configTemplate = await this.fetchOwnedTemplate(request.params.id, request.user.id);
		await this.deleteConfigTemplateUseCase.execute(configTemplate, request.user.id);
		return this.makeApiHttpResponse(200, { deleted: true });
	}

	private async fetchOwnedTemplate(
		id: string,
		userId: string,
		resolveImage = false,
	): Promise<TConfigTemplate> {
		const configTemplate = await this.getConfigTemplateUseCase.execute(id, resolveImage);
		if (!configTemplate) {
			throw new ConfigTemplateNotFoundError();
		}
		this.ensureOwnership(configTemplate, userId);
		return configTemplate;
	}
}

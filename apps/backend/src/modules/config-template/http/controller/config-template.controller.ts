import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import type { IHttpRequestWithAuth } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import { DeleteConfigTemplateUseCase } from '../../useCase/delete-config-template.use-case';
import { CreateConfigTemplateUseCase } from '../../useCase/create-config-template.use-case';
import { ListConfigTemplatesUseCase } from '../../useCase/list-config-templates.use-case';
import { UpdateConfigTemplateUseCase } from '../../useCase/update-config-template.use-case';
import { ConfigTemplateNotFoundError } from '../../error/http/config-template-not-found.error';
import { UnauthorizedError } from '@/core/error/http';
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
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';

@injectable()
export class ConfigTemplateController extends AbstractController {
	constructor(
		@inject(GetConfigTemplateUseCase)
		private getConfigTemplateUseCase: GetConfigTemplateUseCase,
		@inject(ListConfigTemplatesUseCase)
		private listConfigTemplatesUseCase: ListConfigTemplatesUseCase,
		@inject(CreateConfigTemplateUseCase)
		private createConfigTemplateUseCase: CreateConfigTemplateUseCase,
		@inject(UpdateConfigTemplateUseCase)
		private updateConfigTemplateUseCase: UpdateConfigTemplateUseCase,
		@inject(DeleteConfigTemplateUseCase)
		private deleteConfigTemplateUseCase: DeleteConfigTemplateUseCase,
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
			summary: 'List Templates',
			description:
				'Fetches a paginated list of templates created by the authenticated user. Supports filtering via query parameters and returns pagination info including page, limit, total count, and template data.',
			operationId: 'template/list-templates',
		},
	})
	async list(
		request: IHttpRequestWithAuth<unknown, unknown, TGetConfigTemplateQueryParamsDto>,
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

		// create pagination response object
		const pagination = {
			page: page,
			limit: limit,
			total,
			data: configTemplates,
		};

		return this.makeApiHttpResponse(200, ConfigTemplatePaginatedResponseDto.parse(pagination));
	}

	@Get('/predefined', {
		skipAuth: true,
		responseSchema: {
			200: ConfigTemplatePaginatedResponseDto,
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'List Predefined Templates',
			description: 'Fetches a paginated list of predefined templates available for all users.',
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

		// create pagination response object
		const pagination = {
			page: page,
			limit: limit,
			total,
			data: configTemplates,
		};

		return this.makeApiHttpResponse(200, ConfigTemplatePaginatedResponseDto.parse(pagination));
	}

	@Post('', {
		skipAuth: true,
		bodySchema: CreateConfigTemplateDto,
		responseSchema: {
			200: ConfigTemplateResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: {
			rateLimit: {
				max: 5,
			},
		},
		schema: {
			summary: 'Create a new template',
			description: 'Creates a new template based on the provided data.',
			operationId: 'template/create-template',
		},
	})
	async create(
		request: IHttpRequestWithAuth<TCreateConfigTemplateDto>,
	): Promise<IHttpResponse<TConfigTemplateResponseDto>> {
		// user can be logged in or not

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
			description: 'Get Template by ID',
			summary: 'Get Template',
			operationId: 'template/get-template-by-id',
		},
	})
	async getOneById(
		request: IHttpRequestWithAuth<unknown, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TConfigTemplateResponseDto>> {
		const { id } = request.params;

		const configTemplate = await this.getConfigTemplateUseCase.execute(id, true);
		if (!configTemplate) {
			throw new ConfigTemplateNotFoundError();
		}

		if (configTemplate.createdBy !== request.user.id) {
			throw new UnauthorizedError();
		}

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
			description: 'Update Template by ID',
			summary: 'Update Template',
			operationId: 'template/update-template-by-id',
		},
	})
	async update(
		request: IHttpRequestWithAuth<TUpdateConfigTemplateDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TConfigTemplateResponseDto>> {
		const { id } = request.params;

		const configTemplate = await this.getConfigTemplateUseCase.execute(id);
		if (!configTemplate) {
			throw new ConfigTemplateNotFoundError();
		}

		if (configTemplate.createdBy !== request.user.id) {
			throw new UnauthorizedError();
		}

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
			description: 'Delete Template by ID',
			summary: 'Delete Template',
			operationId: 'template/delete-template-id',
		},
	})
	async deleteOneById(request: IHttpRequestWithAuth<unknown, TIdRequestQueryDto>) {
		const { id } = request.params;

		const configTemplate = await this.getConfigTemplateUseCase.execute(id);
		if (!configTemplate) {
			throw new ConfigTemplateNotFoundError();
		}

		if (configTemplate.createdBy !== request.user.id) {
			throw new UnauthorizedError();
		}

		await this.deleteConfigTemplateUseCase.execute(configTemplate, request.user.id);
		return this.makeApiHttpResponse(200, { deleted: true });
	}
}

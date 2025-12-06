import { Delete, Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import type { IHttpRequestWithAuth } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../../domain/repository/config-template.repository';
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
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
	) {
		super();
	}

	@Get('', { querySchema: GetConfigTemplateQueryParamsDto })
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
		bodySchema: CreateConfigTemplateDto,
		config: {
			rateLimit: {
				max: 5,
			},
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

	@Get('/:id')
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

	@Post('/:id')
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

		const updateTemplateDto = UpdateConfigTemplateDto.parse(request.body);

		const updatedTemplate = await this.updateConfigTemplateUseCase.execute(
			configTemplate,
			updateTemplateDto,
			request.user.id,
		);

		return this.makeApiHttpResponse(200, ConfigTemplateResponseDto.parse(updatedTemplate));
	}

	@Delete('/:id')
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

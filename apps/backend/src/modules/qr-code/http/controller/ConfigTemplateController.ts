import { Delete, Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/AbstractController';
import { type IHttpRequestWithAuth } from '@/core/interface/IRequest';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../../domain/repository/ConfigTemplateRepository';
import { DeleteConfigTemplateUseCase } from '../../useCase/config-template/DeleteConfigTemplateUseCase';
import { CreateConfigTemplateUseCase } from '../../useCase/config-template/CreateConfigTemplateUseCase';
import { ConfigTemplateNotFoundError } from '../../error/http/ConfigTemplateNotFoundError';
import { UnauthorizedError } from '@/core/error/http';
import { type IHttpResponse } from '@/core/interface/IResponse';
import { ListConfigTemplatesUseCase } from '../../useCase/config-template/ListConfigTemplatesUseCase';
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
} from '@shared/schemas';

@injectable()
export class ConfigTemplateController extends AbstractController {
	constructor(
		@inject(ListConfigTemplatesUseCase)
		private listConfigTemplatesUseCase: ListConfigTemplatesUseCase,
		@inject(CreateConfigTemplateUseCase)
		private createConfigTemplateUseCase: CreateConfigTemplateUseCase,
		@inject(DeleteConfigTemplateUseCase)
		private deleteConfigTemplateUseCase: DeleteConfigTemplateUseCase,
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
	) {
		super();
	}

	@Get('/get-my', { querySchema: GetConfigTemplateQueryParamsDto })
	async getMy(
		request: IHttpRequestWithAuth<unknown, unknown, TGetConfigTemplateQueryParamsDto>,
	): Promise<IHttpResponse<TConfigTemplatePaginatedResponseDto>> {
		const { page, limit, where } = request.query;
		const { configTemplates, total } = await this.listConfigTemplatesUseCase.execute({
			limit: limit,
			offset: page,
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

		const configTemplate = await this.configTemplateRepository.findOneById(id);
		if (!configTemplate) {
			throw new ConfigTemplateNotFoundError();
		}

		if (configTemplate.createdBy !== request.user.id) {
			throw new UnauthorizedError();
		}

		return this.makeApiHttpResponse(200, ConfigTemplateResponseDto.parse(configTemplate));
	}

	@Delete('/:id')
	async deleteOneById(request: IHttpRequestWithAuth<unknown, TIdRequestQueryDto>) {
		const { id } = request.params;

		const configTemplate = await this.configTemplateRepository.findOneById(id);
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

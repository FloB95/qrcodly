import { Delete, Get, Patch, Post, Put } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { inject, injectable } from 'tsyringe';
import { CreateTagUseCase } from '../../useCase/create-tag.use-case';
import { UpdateTagUseCase } from '../../useCase/update-tag.use-case';
import { DeleteTagUseCase } from '../../useCase/delete-tag.use-case';
import { ListTagsUseCase } from '../../useCase/list-tags.use-case';
import TagRepository from '../../domain/repository/tag.repository';
import { TagNotFoundError } from '../../error/http/tag-not-found.error';
import { ForbiddenError } from '@/core/error/http';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { type IHttpRequest } from '@/core/interface/request.interface';
import {
	CreateTagDto,
	GetTagQueryParamsSchema,
	SetQrCodeTagsDto,
	TagPaginatedResponseDto,
	TagResponseDto,
	TCreateTagDto,
	TGetTagQueryParamsDto,
	TIdRequestQueryDto,
	TSetQrCodeTagsDto,
	TTagPaginatedResponseDto,
	TTagResponseDto,
	TUpdateTagDto,
	UpdateTagDto,
} from '@shared/schemas';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import { SetQrCodeTagsPolicy } from '../../policies/set-qr-code-tags.policy';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import { z } from 'zod';

@injectable()
export class TagController extends AbstractController {
	constructor(
		@inject(ListTagsUseCase) private readonly listTagsUseCase: ListTagsUseCase,
		@inject(CreateTagUseCase) private readonly createTagUseCase: CreateTagUseCase,
		@inject(UpdateTagUseCase) private readonly updateTagUseCase: UpdateTagUseCase,
		@inject(DeleteTagUseCase) private readonly deleteTagUseCase: DeleteTagUseCase,
		@inject(TagRepository) private readonly tagRepository: TagRepository,
	) {
		super();
	}

	@Get('', {
		querySchema: GetTagQueryParamsSchema,
		responseSchema: {
			200: TagPaginatedResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'List Tags',
			description: 'Fetches a paginated list of tags created by the authenticated user.',
			operationId: 'tag/list-tags',
		},
	})
	async list(
		request: IHttpRequest<unknown, unknown, TGetTagQueryParamsDto>,
	): Promise<IHttpResponse<TTagPaginatedResponseDto>> {
		const { page, limit, where } = request.query;
		const { tags, total } = await this.listTagsUseCase.execute({
			limit,
			page,
			where: {
				...where,
				createdBy: {
					eq: request.user.id,
				},
			},
		});

		const counts = await this.tagRepository.getQrCodeCountsByTagId(request.user.id);

		const pagination = {
			page,
			limit,
			total,
			data: tags.map((tag) => ({
				...tag,
				qrCodeCount: counts.get(tag.id) ?? 0,
			})),
		};

		return this.makeApiHttpResponse(200, TagPaginatedResponseDto.parse(pagination));
	}

	@Post('', {
		bodySchema: CreateTagDto,
		responseSchema: {
			201: TagResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Create a new tag',
			description: 'Creates a new tag based on the provided data.',
			operationId: 'tag/create-tag',
		},
		config: {
			// rateLimitPolicy: RateLimitPolicy.TAG_CREATE,
		},
	})
	async create(request: IHttpRequest<TCreateTagDto>): Promise<IHttpResponse<TTagResponseDto>> {
		const tag = await this.createTagUseCase.execute(request.body, request.user.id);
		return this.makeApiHttpResponse(201, TagResponseDto.parse(tag));
	}

	@Patch('/:id', {
		bodySchema: UpdateTagDto,
		responseSchema: {
			200: TagResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Update Tag',
			description: 'Update a tag by ID.',
			operationId: 'tag/update-tag',
		},
	})
	async update(
		request: IHttpRequest<TUpdateTagDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TTagResponseDto>> {
		const { id } = request.params;

		const tag = await this.tagRepository.findOneById(id);
		if (!tag) throw new TagNotFoundError();
		if (tag.createdBy !== request.user.id) throw new ForbiddenError();

		const updatedTag = await this.updateTagUseCase.execute(tag, request.body, request.user.id);
		return this.makeApiHttpResponse(200, TagResponseDto.parse(updatedTag));
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
			summary: 'Delete Tag',
			description: 'Delete a tag by ID.',
			operationId: 'tag/delete-tag',
		},
	})
	async deleteOneById(request: IHttpRequest<unknown, TIdRequestQueryDto>) {
		const { id } = request.params;

		const tag = await this.tagRepository.findOneById(id);
		if (!tag) throw new TagNotFoundError();
		if (tag.createdBy !== request.user.id) throw new ForbiddenError();

		await this.deleteTagUseCase.execute(tag, request.user.id);
		return this.makeApiHttpResponse(200, { deleted: true });
	}

	@Put('/qr-code/:id', {
		bodySchema: SetQrCodeTagsDto,
		responseSchema: {
			200: z.array(TagResponseDto),
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			summary: 'Set QR Code Tags',
			description: 'Replace all tags for a QR code with the provided tag IDs.',
			operationId: 'tag/set-qr-code-tags',
		},
	})
	async setQrCodeTags(
		request: IHttpRequest<TSetQrCodeTagsDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TTagResponseDto[]>> {
		const { id: qrCodeId } = request.params;
		const { tagIds } = request.body;

		const policy = new SetQrCodeTagsPolicy(request.user, tagIds.length);
		policy.checkAccess();

		await this.tagRepository.setQrCodeTags(qrCodeId, tagIds);
		const tags = await this.tagRepository.findTagsByQrCodeId(qrCodeId);

		return this.makeApiHttpResponse(
			200,
			tags.map((t) => TagResponseDto.parse(t)),
		);
	}
}

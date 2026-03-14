import { Delete, Get, Patch, Post, Put } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { inject, injectable } from 'tsyringe';
import { CreateTagUseCase } from '../../useCase/create-tag.use-case';
import { UpdateTagUseCase } from '../../useCase/update-tag.use-case';
import { DeleteTagUseCase } from '../../useCase/delete-tag.use-case';
import { ListTagsUseCase } from '../../useCase/list-tags.use-case';
import { SetQrCodeTagsUseCase } from '../../useCase/set-qr-code-tags.use-case';
import { SetShortUrlTagsUseCase } from '../../useCase/set-short-url-tags.use-case';
import TagRepository from '../../domain/repository/tag.repository';
import { type TTag } from '../../domain/entities/tag.entity';
import { TagNotFoundError } from '../../error/http/tag-not-found.error';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { type IHttpRequest } from '@/core/interface/request.interface';
import {
	CreateTagDto,
	GetTagQueryParamsSchema,
	SetQrCodeTagsDto,
	SetShortUrlTagsDto,
	TagPaginatedResponseDto,
	TagResponseDto,
	TCreateTagDto,
	TGetTagQueryParamsDto,
	TIdRequestQueryDto,
	TSetQrCodeTagsDto,
	TSetShortUrlTagsDto,
	TTagPaginatedResponseDto,
	TTagResponseDto,
	TUpdateTagDto,
	UpdateTagDto,
} from '@shared/schemas';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import { z } from 'zod';

@injectable()
export class TagController extends AbstractController {
	constructor(
		@inject(ListTagsUseCase) private readonly listTagsUseCase: ListTagsUseCase,
		@inject(CreateTagUseCase) private readonly createTagUseCase: CreateTagUseCase,
		@inject(UpdateTagUseCase) private readonly updateTagUseCase: UpdateTagUseCase,
		@inject(DeleteTagUseCase) private readonly deleteTagUseCase: DeleteTagUseCase,
		@inject(SetQrCodeTagsUseCase) private readonly setQrCodeTagsUseCase: SetQrCodeTagsUseCase,
		@inject(SetShortUrlTagsUseCase)
		private readonly setShortUrlTagsUseCase: SetShortUrlTagsUseCase,
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
			tags: ['Tags'],
			summary: 'List tags',
			description:
				'Returns a paginated list of tags owned by the authenticated user, including the number of QR codes assigned to each tag. ' +
				'Supports filtering by name and creation date.',
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
			tags: ['Tags'],
			summary: 'Create a tag',
			description:
				'Creates a new tag with a name and hex color. Tags can be assigned to QR codes and short URLs for organization.',
			operationId: 'tag/create-tag',
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.TAG_CREATE,
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
			tags: ['Tags'],
			summary: 'Update a tag',
			description:
				'Partially updates a tag name and/or color. Only the owner can update their tags.',
			operationId: 'tag/update-tag',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'Tag UUID' },
				},
			},
		},
	})
	async update(
		request: IHttpRequest<TUpdateTagDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TTagResponseDto>> {
		const tag = await this.fetchOwnedTag(request.params.id, request.user.id);
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
			tags: ['Tags'],
			summary: 'Delete a tag',
			description:
				'Permanently deletes a tag. The tag is automatically unlinked from all QR codes and short URLs.',
			operationId: 'tag/delete-tag',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'Tag UUID' },
				},
			},
		},
	})
	async deleteOneById(request: IHttpRequest<unknown, TIdRequestQueryDto>) {
		const tag = await this.fetchOwnedTag(request.params.id, request.user.id);
		await this.deleteTagUseCase.execute(tag, request.user.id);
		return this.makeApiHttpResponse(200, { deleted: true });
	}

	@Put('/qr-code/:id', {
		bodySchema: SetQrCodeTagsDto,
		responseSchema: {
			200: z.array(TagResponseDto),
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			409: DEFAULT_ERROR_RESPONSES[409],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Tags'],
			summary: 'Set QR code tags',
			description:
				'Replaces all tags assigned to a QR code with the provided list of tag IDs. ' +
				'Pass an empty array to remove all tags. Returns the updated list of tags.',
			operationId: 'tag/set-qr-code-tags',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'QR code UUID to assign tags to' },
				},
			},
		},
	})
	async setQrCodeTags(
		request: IHttpRequest<TSetQrCodeTagsDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TTagResponseDto[]>> {
		const { id: qrCodeId } = request.params;
		const { tagIds } = request.body;

		const tags = await this.setQrCodeTagsUseCase.execute(qrCodeId, tagIds, request.user);

		return this.makeApiHttpResponse(
			200,
			tags.map((t) => TagResponseDto.parse(t)),
		);
	}

	@Put('/short-url/:id', {
		bodySchema: SetShortUrlTagsDto,
		responseSchema: {
			200: z.array(TagResponseDto),
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			409: DEFAULT_ERROR_RESPONSES[409],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['Tags'],
			summary: 'Set short URL tags',
			description:
				'Replaces all tags assigned to a short URL with the provided list of tag IDs. ' +
				'Pass an empty array to remove all tags. Returns the updated list of tags.',
			operationId: 'tag/set-short-url-tags',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'Short URL UUID to assign tags to' },
				},
			},
		},
	})
	async setShortUrlTags(
		request: IHttpRequest<TSetShortUrlTagsDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TTagResponseDto[]>> {
		const { id: shortUrlId } = request.params;
		const { tagIds } = request.body;

		const tags = await this.setShortUrlTagsUseCase.execute(shortUrlId, tagIds, request.user);

		return this.makeApiHttpResponse(
			200,
			tags.map((t) => TagResponseDto.parse(t)),
		);
	}

	private async fetchOwnedTag(id: string, userId: string): Promise<TTag> {
		const tag = await this.tagRepository.findOneById(id);
		if (!tag) throw new TagNotFoundError();
		this.ensureOwnership(tag, userId);
		return tag;
	}
}

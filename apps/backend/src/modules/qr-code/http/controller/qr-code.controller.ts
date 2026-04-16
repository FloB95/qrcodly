import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import QrCodeRepository from '../../domain/repository/qr-code.repository';
import { QrCodeNotFoundError } from '../../error/http/qr-code-not-found.error';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { type TQrCodeWithRelations } from '../../domain/entities/qr-code.entity';
import {
	BulkImportQrCodeDto,
	CreateQrCodeDto,
	GetQrCodeQueryParamsSchema,
	QrCodeWithRelationsPaginatedResponseDto,
	QrCodeWithRelationsResponseDto,
	RenderQrCodeDto,
	TBulkImportQrCodeDto,
	TCreateQrCodeDto,
	TGetQrCodeQueryParamsDto,
	TIdRequestQueryDto,
	TQrCodeWithRelationsPaginatedResponseDto,
	TQrCodeWithRelationsResponseDto,
	TRenderQrCodeDto,
	TUpdateQrCodeDto,
	TWebsiteScreenshotDto,
	UpdateQrCodeDto,
	WebsiteScreenshotDtoSchema,
} from '@shared/schemas';
import { ListQrCodesUseCase } from '../../useCase/list-qr-code.use-case';
import { CreateQrCodeUseCase } from '../../useCase/create-qr-code.use-case';
import { DeleteQrCodeUseCase } from '../../useCase/delete-qr-code.use-case';
import { ImageService } from '@/core/services/image.service';
import { UpdateQrCodeUseCase } from '../../useCase/update-qr-code.use-case';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import { BulkImportQrCodesUseCase } from '../../useCase/bulk-import-qr-codes.use-case';
import { RenderQrCodeUseCase } from '../../useCase/render-qr-code.use-case';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import { DownloadService } from '../../service/download.service';
import { BadRequestError } from '@/core/error/http';
import { ScreenshotService } from '@/core/services/screenshot.service';

@injectable()
export class QrCodeController extends AbstractController {
	constructor(
		@inject(ListQrCodesUseCase) private readonly listQrCodesUseCase: ListQrCodesUseCase,
		@inject(CreateQrCodeUseCase) private readonly createQrCodeUseCase: CreateQrCodeUseCase,
		@inject(UpdateQrCodeUseCase) private readonly updateQrCodeUseCase: UpdateQrCodeUseCase,
		@inject(DeleteQrCodeUseCase) private readonly deleteQrCodeUseCase: DeleteQrCodeUseCase,
		@inject(BulkImportQrCodesUseCase)
		private readonly bulkImportQrCodesUseCase: BulkImportQrCodesUseCase,
		@inject(RenderQrCodeUseCase) private readonly renderQrCodeUseCase: RenderQrCodeUseCase,
		@inject(QrCodeRepository) private readonly qrCodeRepository: QrCodeRepository,
		@inject(ImageService) private readonly imageService: ImageService,
		@inject(DownloadService) private readonly downloadService: DownloadService,
		@inject(ScreenshotService) private readonly screenshotService: ScreenshotService,
	) {
		super();
	}

	@Get('', {
		querySchema: GetQrCodeQueryParamsSchema,
		responseSchema: {
			200: QrCodeWithRelationsPaginatedResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['QR Codes'],
			summary: 'List QR Codes',
			description:
				'Returns a paginated list of QR codes owned by the authenticated user. ' +
				'Supports filtering by name, creation date, content type, and assigned tags.',
			operationId: 'qr-code/list-qr-codes',
		},
	})
	async list(
		request: IHttpRequest<unknown, unknown, TGetQrCodeQueryParamsDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsPaginatedResponseDto>> {
		const { page, limit, where, contentType, tagIds } = request.query;
		const { qrCodes, total } = await this.listQrCodesUseCase.execute({
			limit,
			page,
			where: {
				...where,
				createdBy: {
					eq: request.user.id,
				},
			},
			contentType,
			tagIds,
		});

		const pagination = {
			page: page,
			limit: limit,
			total,
			data: qrCodes,
		};

		return this.makeApiHttpResponse(200, QrCodeWithRelationsPaginatedResponseDto.parse(pagination));
	}

	@Post('', {
		authHandler: false,
		bodySchema: CreateQrCodeDto,
		responseSchema: {
			200: QrCodeWithRelationsResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.QR_CREATE,
		},
		schema: {
			tags: ['QR Codes', 'Public'],
			summary: 'Create a new QR code',
			description:
				'Creates a new QR code based on the provided data. Supports 8 content types: URL, Text, WiFi, vCard, Email, Location, Event, and EPC. ' +
				'If the QR code is dynamic (contentType=URL and isDynamic=true), a short URL is automatically generated and linked so the destination can be changed later. ' +
				'This endpoint is publicly accessible (no auth required) but rate-limited. Authenticated users get their QR codes saved to their account.',
			operationId: 'qr-code/create-qr-code',
		},
	})
	async create(
		request: IHttpRequest<TCreateQrCodeDto, unknown, unknown, false>,
	): Promise<IHttpResponse<TQrCodeWithRelationsResponseDto>> {
		const qrCode = await this.createQrCodeUseCase.execute(request.body, request.user);
		return this.makeApiHttpResponse(201, QrCodeWithRelationsResponseDto.parse(qrCode));
	}

	@Post('/bulk-import', {
		bodySchema: BulkImportQrCodeDto,
		responseSchema: {
			201: QrCodeWithRelationsResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.BULK_QR_CREATE,
		},
		schema: {
			tags: ['QR Codes'],
			summary: 'Bulk-create QR codes from CSV',
			description:
				'Generates multiple QR codes at once from a CSV file upload. Each row in the CSV maps to one QR code. ' +
				'All QR codes share the same styling configuration and content type. ' +
				'Returns an array of created QR code objects including any related entities.',
			operationId: 'qr-code/bulk-create-qr-codes',
		},
	})
	async bulkImport(request: IHttpRequest<TBulkImportQrCodeDto>): Promise<IHttpResponse<any>> {
		const qrCodes = await this.bulkImportQrCodesUseCase.execute(request.body, request.user);
		const response = qrCodes.map((qrCode) => QrCodeWithRelationsResponseDto.parse(qrCode));
		return this.makeApiHttpResponse(201, response);
	}

	@Get('/:id', {
		responseSchema: {
			200: QrCodeWithRelationsResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['QR Codes'],
			summary: 'Get QR code by ID',
			description:
				'Returns a single QR code with its full configuration, content, linked short URL, and tags. ' +
				'Only the owner can access their QR codes.',
			operationId: 'qr-code/get-qr-code-by-id',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'QR code UUID' },
				},
			},
		},
	})
	async getOneById(
		request: IHttpRequest<unknown, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsResponseDto>> {
		const qrCode = await this.fetchOwnedQrCode(request.params.id, request.user.id);

		if (qrCode.config.image) {
			qrCode.config.image = this.imageService.getPublicUrl(qrCode.config.image);
		}
		if (qrCode.previewImage) {
			qrCode.previewImage = this.imageService.getPublicUrl(qrCode.previewImage);
		}

		return this.makeApiHttpResponse(200, QrCodeWithRelationsResponseDto.parse(qrCode));
	}

	@Patch('/:id', {
		bodySchema: UpdateQrCodeDto,
		responseSchema: {
			200: QrCodeWithRelationsResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			tags: ['QR Codes'],
			summary: 'Update QR code',
			description:
				'Partially updates a QR code. You can change the name, content, or styling configuration. ' +
				'For dynamic QR codes, updating the URL content also updates the linked short URL destination. ' +
				'Only the owner can update their QR codes.',
			operationId: 'qr-code/update-qr-code-by-id',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'QR code UUID' },
				},
			},
		},
	})
	async update(
		request: IHttpRequest<TUpdateQrCodeDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsResponseDto>> {
		const qrCode = await this.fetchOwnedQrCode(request.params.id, request.user.id);

		const updatedQrCode = await this.updateQrCodeUseCase.execute(
			qrCode,
			request.body,
			request.user.id,
		);

		return this.makeApiHttpResponse(200, QrCodeWithRelationsResponseDto.parse(updatedQrCode));
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
			tags: ['QR Codes'],
			summary: 'Delete QR code',
			description:
				'Permanently deletes a QR code and its associated short URL (if any). Only the owner can delete their QR codes.',
			operationId: 'qr-code/delete-qr-code-by-id',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'QR code UUID' },
				},
			},
		},
	})
	async deleteOneById(request: IHttpRequest<unknown, TIdRequestQueryDto>) {
		const qrCode = await this.fetchOwnedQrCode(request.params.id, request.user.id);

		await this.deleteQrCodeUseCase.execute(qrCode, request.user.id);
		return this.makeApiHttpResponse(200, { deleted: true });
	}

	@Get('/:id/download', {
		authHandler: false,
		schema: {
			hide: true,
		},
	})
	async downloadContent(
		request: IHttpRequest<unknown, TIdRequestQueryDto, unknown, false>,
	): Promise<IHttpResponse<string>> {
		const { id } = request.params;

		const qrCode = await this.qrCodeRepository.findOneById(id);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}

		const downloadResponse = await this.downloadService.handle(qrCode);
		if (!downloadResponse) {
			throw new BadRequestError('This QR code type does not support downloading');
		}

		const rawFilename = downloadResponse.filename;
		const asciiFilename = this.downloadService.sanitizeAsciiFilename(rawFilename);
		const encodedFilename = this.downloadService.encodeRFC5987ValueChars(rawFilename);

		return {
			statusCode: 200,
			data: downloadResponse.content,
			headers: {
				'Content-Type': downloadResponse.contentType,
				'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
			},
		};
	}

	@Get('/screenshot', {
		querySchema: WebsiteScreenshotDtoSchema,
		config: {
			rateLimitPolicy: RateLimitPolicy.SCREENSHOT_CREATE,
		},
		schema: {
			hide: true,
		},
	})
	async screenshot(
		request: IHttpRequest<unknown, unknown, TWebsiteScreenshotDto>,
	): Promise<IHttpResponse<Buffer>> {
		const { url } = request.query;

		const imageBuffer = await this.screenshotService.captureWebsite(url);

		return {
			statusCode: 200,
			data: imageBuffer,
			headers: {
				'Content-Type': 'image/jpeg',
				'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
			},
		};
	}

	@Post('/render', {
		bodySchema: RenderQrCodeDto,
		schema: {
			tags: ['QR Codes'],
			summary: 'Render a QR code to an image buffer',
			description:
				'Returns a fully rendered QR code in PNG, WebP, JPEG or SVG. Supports ETag-based caching. Intended for third-party clients (design plugins) that cannot render complex QR-styling output themselves.',
			operationId: 'qr-code/render',
			hide: true,
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.QR_RENDER,
		},
	})
	async render(
		request: IHttpRequest<TRenderQrCodeDto, unknown, unknown, false>,
	): Promise<IHttpResponse<Buffer>> {
		const incomingEtag = (request.headers?.['if-none-match'] as string | undefined) ?? undefined;
		const result = await this.renderQrCodeUseCase.execute(request.body);

		if (incomingEtag && incomingEtag === result.etag) {
			return {
				statusCode: 304,
				data: Buffer.alloc(0),
				headers: {
					ETag: result.etag,
					'Cache-Control': 'private, max-age=86400',
				},
			};
		}

		return {
			statusCode: 200,
			data: result.buffer,
			headers: {
				'Content-Type': result.contentType,
				'Content-Length': String(result.buffer.length),
				ETag: result.etag,
				'Cache-Control': 'private, max-age=86400',
			},
		};
	}

	private async fetchOwnedQrCode(id: string, userId: string): Promise<TQrCodeWithRelations> {
		const qrCode = await this.qrCodeRepository.findOneById(id);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}
		this.ensureOwnership(qrCode, userId);
		return qrCode;
	}
}

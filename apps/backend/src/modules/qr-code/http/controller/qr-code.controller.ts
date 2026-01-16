import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import QrCodeRepository from '../../domain/repository/qr-code.repository';
import { QrCodeNotFoundError } from '../../error/http/qr-code-not-found.error';
import { ForbiddenError } from '@/core/error/http';
import { type IHttpResponse } from '@/core/interface/response.interface';
import {
	BulkImportQrCodeDto,
	CreateQrCodeDto,
	GetQrCodeQueryParamsSchema,
	QrCodeWithRelationsPaginatedResponseDto,
	QrCodeWithRelationsResponseDto,
	TBulkImportQrCodeDto,
	TCreateQrCodeDto,
	TGetQrCodeQueryParamsDto,
	TIdRequestQueryDto,
	TQrCodeWithRelationsPaginatedResponseDto,
	TQrCodeWithRelationsResponseDto,
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
			description: 'List QR Codes',
			summary: 'List QR Codes',
			operationId: 'qr-code/list-qr-codes',
		},
	})
	async list(
		request: IHttpRequest<unknown, unknown, TGetQrCodeQueryParamsDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsPaginatedResponseDto>> {
		const { page, limit, where } = request.query;
		const { qrCodes, total } = await this.listQrCodesUseCase.execute({
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
			data: qrCodes,
		};

		console.log('qrcodes', qrCodes);

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
			summary: 'Create a new QR code',
			description:
				'Creates a new QR code based on the provided data. If the QR code is dynamic (contentType = URL and isEditable = true), a short URL is automatically generated, linked to the QR code, and returned in the response. Returns the full QR code object including any related entities.',
			operationId: 'qr-code/create-qr-code',
		},
	})
	async create(
		request: IHttpRequest<TCreateQrCodeDto, unknown, unknown, false>,
	): Promise<IHttpResponse<TQrCodeWithRelationsResponseDto>> {
		const userId = request.user?.id ?? null;

		// set editable to false if user is not logged in
		if (!userId && request.body.content.type === 'url') {
			request.body.content.data.isEditable = false;
		}

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
			summary: 'Create multiple QR codes from CSV',
			description:
				'Generates multiple QR codes at once using the provided CSV file and optional configuration. ' +
				'Each row in the CSV corresponds to a single QR code. ' +
				'Returns an array of QR code objects including any related entities.',
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
			description: 'Get a QR Code by ID',
			summary: 'Get QR Code',
			operationId: 'qr-code/get-qr-code-by-id',
		},
	})
	async getOneById(
		request: IHttpRequest<unknown, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsResponseDto>> {
		const { id } = request.params;

		const qrCode = await this.qrCodeRepository.findOneById(id);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}

		if (qrCode.createdBy !== request.user.id) {
			throw new ForbiddenError();
		}

		// Convert image path to presigned URL
		await Promise.all([
			(async () => {
				if (qrCode.config.image) {
					qrCode.config.image = await this.imageService.getSignedUrl(qrCode.config.image);
				}
			})(),
			(async () => {
				if (qrCode.previewImage) {
					qrCode.previewImage = (await this.imageService.getSignedUrl(qrCode.previewImage)) ?? null;
				}
			})(),
		]);

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
			description: 'Update a QR Code by ID',
			summary: 'Update QR Code',
			operationId: 'qr-code/update-qr-code-by-id',
		},
	})
	async update(
		request: IHttpRequest<TUpdateQrCodeDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsResponseDto>> {
		const { id } = request.params;

		const qrCode = await this.qrCodeRepository.findOneById(id);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}

		if (qrCode.createdBy !== request.user.id) {
			throw new ForbiddenError();
		}

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
			description: 'Delete a QR Code by ID',
			summary: 'Delete QR Code',
			operationId: 'qr-code/delete-qr-code-by-id',
		},
	})
	async deleteOneById(request: IHttpRequest<unknown, TIdRequestQueryDto>) {
		const { id } = request.params;

		const qrCode = await this.qrCodeRepository.findOneById(id);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}

		if (qrCode.createdBy !== request.user.id) {
			throw new ForbiddenError();
		}

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

		return {
			statusCode: 200,
			data: downloadResponse.content,
			headers: {
				'Content-Type': downloadResponse.contentType,
				'Content-Disposition': `attachment; filename="${downloadResponse.filename}"`,
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
}

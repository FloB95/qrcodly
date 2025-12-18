import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest, type IHttpRequestWithAuth } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import { getAuth } from '@clerk/fastify';
import QrCodeRepository from '../../domain/repository/qr-code.repository';
import { QrCodeNotFoundError } from '../../error/http/qr-code-not-found.error';
import { UnauthorizedError } from '@/core/error/http';
import { type IHttpResponse } from '@/core/interface/response.interface';
import {
	CreateQrCodeDto,
	GetQrCodeQueryParamsSchema,
	QrCodeWithRelationsPaginatedResponseDto,
	QrCodeWithRelationsResponseDto,
	TCreateQrCodeDto,
	TCreateQrCodeResponseDto,
	TGetQrCodeQueryParamsDto,
	TIdRequestQueryDto,
	TQrCodeWithRelationsPaginatedResponseDto,
	TQrCodeWithRelationsResponseDto,
	TUpdateQrCodeDto,
	UpdateQrCodeDto,
} from '@shared/schemas';
import { ListQrCodesUseCase } from '../../useCase/list-qr-code.use-case';
import { CreateQrCodeUseCase } from '../../useCase/create-qr-code.use-case';
import { DeleteQrCodeUseCase } from '../../useCase/delete-qr-code.use-case';
import { ImageService } from '@/core/services/image.service';
import { UpdateQrCodeUseCase } from '../../useCase/update-qr-code.use-case';

@injectable()
export class QrCodeController extends AbstractController {
	constructor(
		@inject(ListQrCodesUseCase) private listQrCodesUseCase: ListQrCodesUseCase,
		@inject(CreateQrCodeUseCase) private createQrCodeUseCase: CreateQrCodeUseCase,
		@inject(UpdateQrCodeUseCase) private updateQrCodeUseCase: UpdateQrCodeUseCase,
		@inject(DeleteQrCodeUseCase) private deleteQrCodeUseCase: DeleteQrCodeUseCase,
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(ImageService) private imageService: ImageService,
	) {
		super();
	}

	@Get('', {
		querySchema: GetQrCodeQueryParamsSchema,
		responseSchema: {
			200: QrCodeWithRelationsPaginatedResponseDto,
		},
		schema: {
			description: 'List QR Codes',
			summary: 'List QR Codes',
		},
	})
	async list(
		request: IHttpRequestWithAuth<unknown, unknown, TGetQrCodeQueryParamsDto>,
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

		return this.makeApiHttpResponse(200, QrCodeWithRelationsPaginatedResponseDto.parse(pagination));
	}

	@Post('', {
		skipAuth: true,
		bodySchema: CreateQrCodeDto,
		config: {
			rateLimit: {
				max: 5,
			},
		},
		schema: {
			description: 'Create a new QR Code',
			summary: 'Create QR Code',
			response: {
				201: {
					type: 'object',
					properties: {
						success: { type: 'boolean' },
						isStored: { type: 'boolean' },
						qrCodeId: { type: 'string' },
					},
				},
			},
		},
	})
	async create(
		request: IHttpRequest<TCreateQrCodeDto>,
	): Promise<IHttpResponse<TCreateQrCodeResponseDto>> {
		// TODO handle api key auth and implement some verification from frontend
		const { userId } = getAuth(request);

		// set editable to false if user is not logged in
		if (!userId && request.body.content.type === 'url') {
			request.body.content.data.isEditable = false;
		}

		const qrCode = await this.createQrCodeUseCase.execute(request.body, userId);
		return this.makeApiHttpResponse(201, {
			success: true,
			isStored: userId ? true : false,
			qrCodeId: qrCode.id,
		});
	}

	@Get('/:id', {
		responseSchema: {
			200: QrCodeWithRelationsResponseDto,
		},
		schema: {
			description: 'Get QR Code by ID',
			summary: 'Get QR Code',
		},
	})
	async getOneById(
		request: IHttpRequestWithAuth<unknown, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsResponseDto>> {
		const { id } = request.params;

		const qrCode = await this.qrCodeRepository.findOneById(id);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}

		if (qrCode.createdBy !== request.user.id) {
			throw new UnauthorizedError();
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
		},
		schema: {
			description: 'Update QR Code by ID',
			summary: 'Update QR Code',
		},
	})
	async update(
		request: IHttpRequestWithAuth<TUpdateQrCodeDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsResponseDto>> {
		const { id } = request.params;

		const qrCode = await this.qrCodeRepository.findOneById(id);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}

		if (qrCode.createdBy !== request.user.id) {
			throw new UnauthorizedError();
		}

		const updatedQrCode = await this.updateQrCodeUseCase.execute(
			qrCode,
			request.body,
			request.user.id,
		);

		return this.makeApiHttpResponse(200, QrCodeWithRelationsResponseDto.parse(updatedQrCode));
	}

	@Delete('/:id', {
		schema: {
			description: 'Delete QR Code by ID',
			summary: 'Delete QR Code',
		},
	})
	async deleteOneById(request: IHttpRequestWithAuth<unknown, TIdRequestQueryDto>) {
		const { id } = request.params;

		const qrCode = await this.qrCodeRepository.findOneById(id);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}

		if (qrCode.createdBy !== request.user.id) {
			throw new UnauthorizedError();
		}

		await this.deleteQrCodeUseCase.execute(qrCode, request.user.id);
		return this.makeApiHttpResponse(200, { deleted: true });
	}
}

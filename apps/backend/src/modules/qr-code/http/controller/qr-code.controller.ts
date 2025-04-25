import { Delete, Get, Post } from '@/core/decorators/route';
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
} from '@shared/schemas';
import { ListQrCodesUseCase } from '../../useCase/list-qr-code.use-case';
import { CreateQrCodeUseCase } from '../../useCase/create-qr-code.use-case';
import { DeleteQrCodeUseCase } from '../../useCase/delete-qr-code.use-case';

@injectable()
export class QrCodeController extends AbstractController {
	constructor(
		@inject(ListQrCodesUseCase) private listQrCodesUseCase: ListQrCodesUseCase,
		@inject(CreateQrCodeUseCase) private createQrCodeUseCase: CreateQrCodeUseCase,
		@inject(DeleteQrCodeUseCase) private deleteQrCodeUseCase: DeleteQrCodeUseCase,
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
	) {
		super();
	}

	@Get('', { querySchema: GetQrCodeQueryParamsSchema })
	async list(
		request: IHttpRequestWithAuth<unknown, unknown, TGetQrCodeQueryParamsDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsPaginatedResponseDto>> {
		const { page, limit, where } = request.query;
		const { qrCodes, total } = await this.listQrCodesUseCase.execute({
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
	})
	async create(
		request: IHttpRequest<TCreateQrCodeDto>,
	): Promise<IHttpResponse<TCreateQrCodeResponseDto>> {
		// user can be logged in or not

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

	@Get('/:id')
	async getOneById(
		request: IHttpRequestWithAuth<unknown, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeWithRelationsResponseDto>> {
		const { id } = request.params;

		const qrCode = await this.qrCodeRepository.findOneById(id);
		console.log('qrCode', qrCode);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}

		if (qrCode.createdBy !== request.user.id) {
			throw new UnauthorizedError();
		}

		return this.makeApiHttpResponse(200, QrCodeWithRelationsResponseDto.parse(qrCode));
	}

	@Delete('/:id')
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

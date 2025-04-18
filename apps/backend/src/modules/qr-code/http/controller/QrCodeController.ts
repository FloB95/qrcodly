import { Delete, Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/AbstractController';
import { type IHttpRequest, type IHttpRequestWithAuth } from '@/core/interface/IRequest';
import { inject, injectable } from 'tsyringe';
import { CreateQrCodeUseCase } from '../../useCase/CreateQRcodeUseCase';
import { getAuth } from '@clerk/fastify';
import QrCodeRepository from '../../domain/repository/QrCodeRepository';
import { DeleteQrCodeUseCase } from '../../useCase/DeleteQrCodeUseCase';
import { QrCodeNotFoundError } from '../../error/http/QrCodeNotFoundError';
import { ListQrCodesUseCase } from '../../useCase/ListQrCodesUseCase';
import { UnauthorizedError } from '@/core/error/http';
import { type IHttpResponse } from '@/core/interface/IResponse';
import {
	GetQrCodeQueryParamsSchema,
	type TCreateQrCodeDto,
	type TQrCodeResponseDto,
	CreateQrCodeDto,
	type TGetQrCodeQueryParamsDto,
	type TQrCodePaginatedResponseDto,
	type TIdRequestQueryDto,
} from 'qrcodly-api-types';

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

	@Get('/get-my', { querySchema: GetQrCodeQueryParamsSchema })
	async getMy(
		request: IHttpRequestWithAuth<unknown, unknown, TGetQrCodeQueryParamsDto>,
	): Promise<IHttpResponse<TQrCodePaginatedResponseDto>> {
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

		return this.makeApiHttpResponse(200, pagination);
	}

	@Post('', {
		skipAuth: true,
		bodySchema: CreateQrCodeDto,
	})
	async create(request: IHttpRequest<TCreateQrCodeDto>) {
		// user can be logged in or not

		const { userId } = getAuth(request);

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
	): Promise<IHttpResponse<TQrCodeResponseDto>> {
		const { id } = request.params;

		const qrCode = await this.qrCodeRepository.findOneById(id);
		if (!qrCode) {
			throw new QrCodeNotFoundError();
		}

		if (qrCode.createdBy !== request.user.id) {
			throw new UnauthorizedError();
		}

		return this.makeApiHttpResponse(200, qrCode);
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

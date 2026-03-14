import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { inject, injectable } from 'tsyringe';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import {
	CreateQrCodeShareDto,
	UpdateQrCodeShareDto,
	QrCodeShareResponseDto,
	PublicSharedQrCodeResponseDto,
	TCreateQrCodeShareDto,
	TUpdateQrCodeShareDto,
	TIdRequestQueryDto,
	TQrCodeShareResponseDto,
	TPublicSharedQrCodeResponseDto,
	TQrCodeShare,
} from '@shared/schemas';
import QrCodeRepository from '../../domain/repository/qr-code.repository';
import QrCodeShareRepository from '../../domain/repository/qr-code-share.repository';
import { QrCodeNotFoundError } from '../../error/http/qr-code-not-found.error';
import { type TQrCodeWithRelations } from '../../domain/entities/qr-code.entity';
import { QrCodeShareNotFoundError } from '../../error/http/qr-code-share-not-found.error';
import { CreateQrCodeShareUseCase } from '../../useCase/create-qr-code-share.use-case';
import { UpdateQrCodeShareUseCase } from '../../useCase/update-qr-code-share.use-case';
import { DeleteQrCodeShareUseCase } from '../../useCase/delete-qr-code-share.use-case';
import { GetPublicSharedQrCodeUseCase } from '../../useCase/get-public-shared-qr-code.use-case';

@injectable()
export class QrCodeShareController extends AbstractController {
	constructor(
		@inject(QrCodeRepository) private readonly qrCodeRepository: QrCodeRepository,
		@inject(QrCodeShareRepository) private readonly qrCodeShareRepository: QrCodeShareRepository,
		@inject(CreateQrCodeShareUseCase) private readonly createShareUseCase: CreateQrCodeShareUseCase,
		@inject(UpdateQrCodeShareUseCase) private readonly updateShareUseCase: UpdateQrCodeShareUseCase,
		@inject(DeleteQrCodeShareUseCase) private readonly deleteShareUseCase: DeleteQrCodeShareUseCase,
	) {
		super();
	}

	@Post('/:id/share', {
		bodySchema: CreateQrCodeShareDto,
		responseSchema: {
			201: QrCodeShareResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
		},
		schema: {
			tags: ['QR Code Sharing'],
			summary: 'Create share link for QR code',
			description:
				'Creates a shareable public link for a QR code. The share link allows anyone to view the QR code without authentication. ' +
				'You can configure whether the QR code name and a download button are shown on the public page.',
			operationId: 'qr-code/create-share-link',
			params: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						format: 'uuid',
						description: 'QR code UUID to create a share link for',
					},
				},
			},
		},
	})
	async createShare(
		request: IHttpRequest<TCreateQrCodeShareDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeShareResponseDto>> {
		const { id } = request.params;
		await this.fetchOwnedQrCode(id, request.user.id);

		const share = await this.createShareUseCase.execute(id, request.user.id, request.body);

		return this.makeApiHttpResponse(201, QrCodeShareResponseDto.parse(share));
	}

	@Get('/:id/share', {
		responseSchema: {
			200: QrCodeShareResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
		},
		schema: {
			tags: ['QR Code Sharing'],
			summary: 'Get share link for QR code',
			description:
				'Retrieves the share link and its display configuration for a QR code. Returns the share token and config options.',
			operationId: 'qr-code/get-share-link',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'QR code UUID' },
				},
			},
		},
	})
	async getShare(
		request: IHttpRequest<unknown, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeShareResponseDto>> {
		const { id } = request.params;
		await this.fetchOwnedQrCode(id, request.user.id);

		const share = await this.qrCodeShareRepository.findByQrCodeId(id);
		if (!share) {
			throw new QrCodeShareNotFoundError();
		}

		return this.makeApiHttpResponse(200, QrCodeShareResponseDto.parse(share));
	}

	@Patch('/:id/share', {
		bodySchema: UpdateQrCodeShareDto,
		responseSchema: {
			200: QrCodeShareResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
		},
		schema: {
			tags: ['QR Code Sharing'],
			summary: 'Update share link configuration',
			description:
				'Updates the display options (showName, showDownloadButton) for an existing share link.',
			operationId: 'qr-code/update-share-link',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'QR code UUID' },
				},
			},
		},
	})
	async updateShare(
		request: IHttpRequest<TUpdateQrCodeShareDto, TIdRequestQueryDto>,
	): Promise<IHttpResponse<TQrCodeShareResponseDto>> {
		const { id } = request.params;
		await this.fetchOwnedQrCode(id, request.user.id);

		const share = await this.qrCodeShareRepository.findByQrCodeId(id);
		if (!share) {
			throw new QrCodeShareNotFoundError();
		}

		const updatedShare = await this.updateShareUseCase.execute(share, request.body);

		return this.makeApiHttpResponse(200, QrCodeShareResponseDto.parse(updatedShare));
	}

	@Delete('/:id/share', {
		responseSchema: {
			200: DeleteResponseSchema,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
		},
		schema: {
			tags: ['QR Code Sharing'],
			summary: 'Delete share link',
			description:
				'Removes the share link for a QR code. The public URL will no longer be accessible after deletion.',
			operationId: 'qr-code/delete-share-link',
			params: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid', description: 'QR code UUID' },
				},
			},
		},
	})
	async deleteShare(
		request: IHttpRequest<unknown, TIdRequestQueryDto>,
	): Promise<IHttpResponse<{ deleted: boolean }>> {
		const { id } = request.params;
		await this.fetchOwnedQrCode(id, request.user.id);

		const share = await this.qrCodeShareRepository.findByQrCodeId(id);
		if (!share) {
			throw new QrCodeShareNotFoundError();
		}

		await this.deleteShareUseCase.execute(share);

		return this.makeApiHttpResponse(200, { deleted: true });
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

@injectable()
export class PublicQrCodeShareController extends AbstractController {
	constructor(
		@inject(GetPublicSharedQrCodeUseCase)
		private readonly getPublicShareUseCase: GetPublicSharedQrCodeUseCase,
	) {
		super();
	}

	@Get('/:shareToken', {
		authHandler: false,
		responseSchema: {
			200: PublicSharedQrCodeResponseDto,
			404: DEFAULT_ERROR_RESPONSES[404],
		},
		schema: {
			tags: ['Public', 'QR Code Sharing'],
			summary: 'Get public shared QR code',
			description:
				'Publicly accessible endpoint (no authentication required) to view a shared QR code by its share token. ' +
				'Returns the QR code image data, content, styling, and share display configuration.',
			operationId: 'public/get-shared-qr-code',
			params: {
				type: 'object',
				properties: {
					shareToken: {
						type: 'string',
						format: 'uuid',
						description: 'Unique share token from the share link URL',
					},
				},
			},
		},
	})
	async getPublicShare(
		request: IHttpRequest<unknown, Pick<TQrCodeShare, 'shareToken'>, unknown, false>,
	): Promise<IHttpResponse<TPublicSharedQrCodeResponseDto>> {
		const { shareToken } = request.params;

		const sharedQrCode = await this.getPublicShareUseCase.execute(shareToken);

		return this.makeApiHttpResponse(200, PublicSharedQrCodeResponseDto.parse(sharedQrCode));
	}
}

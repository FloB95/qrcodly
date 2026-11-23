import { isIP } from 'node:net';
import { Delete, Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { inject, injectable } from 'tsyringe';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { DeleteResponseSchema } from '@/core/domain/schema/DeleteResponseSchema';
import {
	CreateScanIpExclusionDto,
	CurrentClientIpResponseDto,
	ScanIpExclusionIdParamsDto,
	ScanIpExclusionListResponseDto,
	ScanIpExclusionResponseDto,
	type TCreateScanIpExclusionDto,
	type TCurrentClientIpResponseDto,
	type TScanIpExclusionIdParamsDto,
	type TScanIpExclusionListResponseDto,
	type TScanIpExclusionResponseDto,
} from '@shared/schemas';
import { CreateScanIpExclusionUseCase } from '../../useCase/create-scan-ip-exclusion.use-case';
import { DeleteScanIpExclusionUseCase } from '../../useCase/delete-scan-ip-exclusion.use-case';
import { ListScanIpExclusionsUseCase } from '../../useCase/list-scan-ip-exclusions.use-case';
import ScanIpExclusionRepository from '../../domain/repository/scan-ip-exclusion.repository';
import { ScanIpExclusionNotFoundError } from '../../error';

@injectable()
export class ScanIpExclusionController extends AbstractController {
	constructor(
		@inject(ListScanIpExclusionsUseCase)
		private readonly listUseCase: ListScanIpExclusionsUseCase,
		@inject(CreateScanIpExclusionUseCase)
		private readonly createUseCase: CreateScanIpExclusionUseCase,
		@inject(DeleteScanIpExclusionUseCase)
		private readonly deleteUseCase: DeleteScanIpExclusionUseCase,
		@inject(ScanIpExclusionRepository)
		private readonly repository: ScanIpExclusionRepository,
	) {
		super();
	}

	@Get('', {
		responseSchema: {
			200: ScanIpExclusionListResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'List excluded IP ranges',
			description: 'Lists the IP addresses and ranges whose scans are not counted.',
			operationId: 'scan-ip-exclusion/list',
		},
	})
	async list(request: IHttpRequest): Promise<IHttpResponse<TScanIpExclusionListResponseDto>> {
		const exclusions = await this.listUseCase.execute(request.user.id);
		return this.makeApiHttpResponse(200, ScanIpExclusionListResponseDto.parse(exclusions));
	}

	@Get('/current-ip', {
		responseSchema: {
			200: CurrentClientIpResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Get the caller IP',
			description: 'Returns the public IP address the API sees for the caller.',
			operationId: 'scan-ip-exclusion/current-ip',
		},
	})
	async currentIp(request: IHttpRequest): Promise<IHttpResponse<TCurrentClientIpResponseDto>> {
		const ip = request.clientIp;
		return this.makeApiHttpResponse(200, { ip: ip && isIP(ip) ? ip : null });
	}

	@Post('', {
		bodySchema: CreateScanIpExclusionDto,
		responseSchema: {
			201: ScanIpExclusionResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			409: DEFAULT_ERROR_RESPONSES[409],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Exclude an IP range',
			description: 'Stops counting scans from an IP address or CIDR range (pro only).',
			operationId: 'scan-ip-exclusion/create',
		},
	})
	async create(
		request: IHttpRequest<TCreateScanIpExclusionDto>,
	): Promise<IHttpResponse<TScanIpExclusionResponseDto>> {
		const exclusion = await this.createUseCase.execute(request.body, request.user);
		return this.makeApiHttpResponse(201, ScanIpExclusionResponseDto.parse(exclusion));
	}

	@Delete('/:id', {
		responseSchema: {
			200: DeleteResponseSchema,
			401: DEFAULT_ERROR_RESPONSES[401],
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		schema: {
			hide: true,
			summary: 'Remove an excluded IP range',
			description: 'Counts scans from this IP address or range again.',
			operationId: 'scan-ip-exclusion/delete',
		},
	})
	async delete(request: IHttpRequest<unknown, TScanIpExclusionIdParamsDto>) {
		const { id } = ScanIpExclusionIdParamsDto.parse(request.params);
		const exclusion = await this.repository.findOneById(id);
		// Someone else's entry is reported as missing, so ids of other accounts stay unconfirmed
		if (!exclusion || exclusion.createdBy !== request.user.id) {
			throw new ScanIpExclusionNotFoundError();
		}
		await this.deleteUseCase.execute(exclusion);
		return this.makeApiHttpResponse(200, { deleted: true });
	}
}

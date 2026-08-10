import { Delete, Get, Patch, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { inject, injectable } from 'tsyringe';
import {
	CreateDomainAddonCheckoutDto,
	DomainAddonCancelResponseDto,
	DomainAddonCheckoutResponseDto,
	DomainAddonQuantityResponseDto,
	DomainAddonResponseDto,
	UpdateDomainAddonQuantityDto,
	type TCreateDomainAddonCheckoutDto,
	type TDomainAddonCancelResponseDto,
	type TDomainAddonCheckoutResponseDto,
	type TDomainAddonQuantityResponseDto,
	type TDomainAddonResponseDto,
	type TUpdateDomainAddonQuantityDto,
} from '@shared/schemas';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { ManageDomainAddonUseCase } from '../../useCase/manage-domain-addon.use-case';

@injectable()
export class DomainAddonController extends AbstractController {
	constructor(
		@inject(ManageDomainAddonUseCase)
		private readonly manageDomainAddonUseCase: ManageDomainAddonUseCase,
	) {
		super();
	}

	@Get('', {
		responseSchema: {
			200: DomainAddonResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
		},
		schema: { hide: true },
	})
	async get(request: IHttpRequest): Promise<IHttpResponse<TDomainAddonResponseDto>> {
		const { addon, entitlement, usedDomains } = await this.manageDomainAddonUseCase.getOverview(
			request.user.id,
		);

		return this.makeApiHttpResponse(200, {
			addon: addon
				? {
						status: addon.status,
						stripePriceId: addon.stripePriceId,
						quantity: addon.quantity,
						pendingQuantity: addon.pendingQuantity,
						pendingQuantityEffectiveAt: addon.pendingQuantityEffectiveAt?.toISOString() ?? null,
						currentPeriodEnd: addon.currentPeriodEnd.toISOString(),
						cancelAtPeriodEnd: addon.cancelAtPeriodEnd,
					}
				: null,
			entitlement: { ...entitlement, usedDomains },
		});
	}

	@Post('/checkout-session', {
		bodySchema: CreateDomainAddonCheckoutDto,
		responseSchema: {
			200: DomainAddonCheckoutResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			409: DEFAULT_ERROR_RESPONSES[409],
		},
		schema: { hide: true },
	})
	async createCheckoutSession(
		request: IHttpRequest<TCreateDomainAddonCheckoutDto>,
	): Promise<IHttpResponse<TDomainAddonCheckoutResponseDto>> {
		const dto = CreateDomainAddonCheckoutDto.parse(request.body);
		const result = await this.manageDomainAddonUseCase.createCheckoutSession(request.user.id, dto);

		return this.makeApiHttpResponse(200, result);
	}

	@Patch('/quantity', {
		bodySchema: UpdateDomainAddonQuantityDto,
		responseSchema: {
			200: DomainAddonQuantityResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
		},
		schema: { hide: true },
	})
	async updateQuantity(
		request: IHttpRequest<TUpdateDomainAddonQuantityDto>,
	): Promise<IHttpResponse<TDomainAddonQuantityResponseDto>> {
		const { quantity } = UpdateDomainAddonQuantityDto.parse(request.body);
		const result = await this.manageDomainAddonUseCase.updateQuantity(request.user.id, quantity);

		return this.makeApiHttpResponse(200, {
			quantity: result.quantity,
			pendingQuantity: result.pendingQuantity,
			effectiveAt: result.effectiveAt?.toISOString() ?? null,
			willDisable: result.willDisable,
		});
	}

	@Delete('', {
		responseSchema: {
			200: DomainAddonCancelResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			404: DEFAULT_ERROR_RESPONSES[404],
		},
		schema: { hide: true },
	})
	async cancel(request: IHttpRequest): Promise<IHttpResponse<TDomainAddonCancelResponseDto>> {
		const result = await this.manageDomainAddonUseCase.cancel(request.user.id);

		return this.makeApiHttpResponse(200, {
			cancelAtPeriodEnd: result.cancelAtPeriodEnd,
			effectiveAt: result.effectiveAt?.toISOString() ?? null,
			willDisable: result.willDisable,
		});
	}

	@Post('/reactivate', {
		responseSchema: {
			200: DomainAddonCancelResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			404: DEFAULT_ERROR_RESPONSES[404],
		},
		schema: { hide: true },
	})
	async reactivate(request: IHttpRequest): Promise<IHttpResponse<TDomainAddonCancelResponseDto>> {
		const result = await this.manageDomainAddonUseCase.reactivate(request.user.id);

		return this.makeApiHttpResponse(200, {
			cancelAtPeriodEnd: result.cancelAtPeriodEnd,
			effectiveAt: null,
			willDisable: [],
		});
	}
}

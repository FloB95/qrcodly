import { Get } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { inject, injectable } from 'tsyringe';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { TokenTypeSchema } from '@/core/domain/schema/UserSchema';
import {
	HostedPageUsageRequestQueryDto,
	HostedPageUsageResponseDto,
	type THostedPageUsageRequestQueryDto,
	type THostedPageUsageResponseDto,
} from '@shared/schemas';
import { GetHostedPageUsageUseCase } from '../../useCase/get-hosted-page-usage.use-case';

/** Lives apart from the page routes so no path segment can collide with a page's short code. */
@injectable()
export class HostedPageUsageController extends AbstractController {
	constructor(
		@inject(GetHostedPageUsageUseCase) private readonly usageUseCase: GetHostedPageUsageUseCase,
	) {
		super();
	}

	@Get('/usage', {
		querySchema: HostedPageUsageRequestQueryDto,
		responseSchema: {
			200: HostedPageUsageResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: { allowedTokenTypes: [...TokenTypeSchema.options] },
		// hosted pages stay out of the public API docs, but API keys keep working
		schema: { hide: true },
	})
	async usage(
		request: IHttpRequest<unknown, unknown, THostedPageUsageRequestQueryDto>,
	): Promise<IHttpResponse<THostedPageUsageResponseDto>> {
		const { excludeQrCodeId } = HostedPageUsageRequestQueryDto.parse(request.query);
		const usage = await this.usageUseCase.execute(request.user.id, excludeQrCodeId);
		return this.makeApiHttpResponse(200, HostedPageUsageResponseDto.parse(usage));
	}
}

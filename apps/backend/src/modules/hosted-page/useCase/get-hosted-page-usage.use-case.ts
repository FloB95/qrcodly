import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { type THostedPageUsageResponseDto } from '@shared/schemas';
import { HostedPageEntitlementService } from '../service/hosted-page-entitlement.service';
import { HostedPageService } from '../service/hosted-page.service';

const counter = (used: number, limit: number) => ({
	used,
	limit,
	remaining: Math.max(0, limit - used),
});

@injectable()
export class GetHostedPageUsageUseCase implements IBaseUseCase {
	constructor(
		@inject(HostedPageService) private readonly hostedPageService: HostedPageService,
		@inject(HostedPageEntitlementService)
		private readonly entitlementService: HostedPageEntitlementService,
	) {}

	async execute(userId: string, excludeQrCodeId?: string): Promise<THostedPageUsageResponseDto> {
		const [{ plan, limits }, usage] = await Promise.all([
			this.entitlementService.getLimits(userId),
			this.hostedPageService.getUsage(userId, excludeQrCodeId),
		]);
		return {
			plan,
			landingPages: counter(usage.landingPages, limits.maxLandingPages),
			files: counter(usage.files, limits.maxFiles),
			maxFileSizeBytes: limits.maxFileSizeBytes,
		};
	}
}

import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { type TAnalyticsResponseDto } from '@shared/schemas';
import { PlanName } from '@/core/config/plan.config';
import { UmamiAnalyticsService } from '../service/umami-analytics.service';

@injectable()
export class GetShortUrlAnalyticsUseCase implements IBaseUseCase {
	constructor(
		@inject(UmamiAnalyticsService) private readonly umamiAnalyticsService: UmamiAnalyticsService,
	) {}

	/** Every plan gets the headline figures; breakdowns and time series are Pro only. */
	async execute(shortCode: string, plan: PlanName): Promise<TAnalyticsResponseDto> {
		return this.umamiAnalyticsService.getAnalyticsForEndpoint(`/u/${shortCode}`, {
			includeDetails: plan === PlanName.PRO,
		});
	}
}

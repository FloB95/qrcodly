import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import AnalyticsIntegrationRepository from '../domain/repository/analytics-integration.repository';
import { type TAnalyticsIntegration } from '../domain/entities/analytics-integration.entity';

@injectable()
export class ListAnalyticsIntegrationsUseCase implements IBaseUseCase {
	constructor(
		@inject(AnalyticsIntegrationRepository)
		private repository: AnalyticsIntegrationRepository,
	) {}

	async execute(userId: string): Promise<TAnalyticsIntegration[]> {
		return this.repository.findAllByUserId(userId);
	}
}

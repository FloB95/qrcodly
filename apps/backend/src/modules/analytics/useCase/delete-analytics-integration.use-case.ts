import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import AnalyticsIntegrationRepository from '../domain/repository/analytics-integration.repository';
import { type TAnalyticsIntegration } from '../domain/entities/analytics-integration.entity';

@injectable()
export class DeleteAnalyticsIntegrationUseCase implements IBaseUseCase {
	constructor(
		@inject(AnalyticsIntegrationRepository)
		private repository: AnalyticsIntegrationRepository,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(integration: TAnalyticsIntegration): Promise<void> {
		await this.repository.delete(integration);

		this.logger.info('analyticsIntegration.deleted', {
			analyticsIntegration: {
				id: integration.id,
				providerType: integration.providerType,
			},
		});
	}
}

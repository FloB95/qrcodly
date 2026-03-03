import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import AnalyticsIntegrationRepository from '../domain/repository/analytics-integration.repository';
import { type TAnalyticsIntegration } from '../domain/entities/analytics-integration.entity';
import { CredentialEncryptionService } from '../service/credential-encryption.service';
import { AnalyticsProviderRegistry } from '../service/providers/analytics-provider.registry';

@injectable()
export class TestAnalyticsIntegrationUseCase implements IBaseUseCase {
	constructor(
		@inject(AnalyticsIntegrationRepository)
		private repository: AnalyticsIntegrationRepository,
		@inject(CredentialEncryptionService)
		private encryptionService: CredentialEncryptionService,
		@inject(AnalyticsProviderRegistry)
		private providerRegistry: AnalyticsProviderRegistry,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(integration: TAnalyticsIntegration): Promise<{ valid: boolean }> {
		const credentials = this.encryptionService.decrypt(
			integration.encryptedCredentials,
			integration.encryptionIv,
			integration.encryptionTag,
		);

		const provider = this.providerRegistry.getProvider(integration.providerType);
		const valid = await provider.validateCredentials(credentials);

		this.logger.info('analyticsIntegration.test', {
			analyticsIntegration: {
				id: integration.id,
				providerType: integration.providerType,
				valid,
			},
		});

		return { valid };
	}
}

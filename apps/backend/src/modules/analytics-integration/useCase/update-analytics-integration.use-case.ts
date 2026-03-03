import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { type TUpdateAnalyticsIntegrationDto } from '@shared/schemas';
import AnalyticsIntegrationRepository from '../domain/repository/analytics-integration.repository';
import { type TAnalyticsIntegration } from '../domain/entities/analytics-integration.entity';
import { CredentialEncryptionService } from '../service/credential-encryption.service';

@injectable()
export class UpdateAnalyticsIntegrationUseCase implements IBaseUseCase {
	constructor(
		@inject(AnalyticsIntegrationRepository)
		private repository: AnalyticsIntegrationRepository,
		@inject(CredentialEncryptionService)
		private encryptionService: CredentialEncryptionService,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(
		integration: TAnalyticsIntegration,
		dto: TUpdateAnalyticsIntegrationDto,
	): Promise<TAnalyticsIntegration> {
		const updates: Partial<TAnalyticsIntegration> = {};

		if (dto.credentials) {
			const { encrypted, iv, tag } = this.encryptionService.encrypt(dto.credentials);
			updates.encryptedCredentials = encrypted;
			updates.encryptionIv = iv;
			updates.encryptionTag = tag;
			// Reset failure counter when credentials are updated
			updates.consecutiveFailures = 0;
			updates.lastError = null;
			updates.lastErrorAt = null;
		}

		if (dto.isEnabled !== undefined) {
			updates.isEnabled = dto.isEnabled;
			// Reset failure counter when re-enabling
			if (dto.isEnabled) {
				updates.consecutiveFailures = 0;
				updates.lastError = null;
				updates.lastErrorAt = null;
			}
		}

		await this.repository.update(integration, updates);

		const updated = await this.repository.findOneById(integration.id);
		if (!updated) throw new Error('Failed to update analytics integration');

		this.logger.info('analyticsIntegration.updated', {
			analyticsIntegration: {
				id: updated.id,
				providerType: updated.providerType,
			},
		});

		return updated;
	}
}

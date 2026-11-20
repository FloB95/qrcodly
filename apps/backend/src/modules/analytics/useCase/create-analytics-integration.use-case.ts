import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { type TCreateAnalyticsIntegrationDto } from '@shared/schemas';
import AnalyticsIntegrationRepository from '../domain/repository/analytics-integration.repository';
import { type TAnalyticsIntegration } from '../domain/entities/analytics-integration.entity';
import { ManageAnalyticsIntegrationPolicy } from '../policies/manage-analytics-integration.policy';
import { CredentialEncryptionService } from '../service/credential-encryption.service';

@injectable()
export class CreateAnalyticsIntegrationUseCase implements IBaseUseCase {
	constructor(
		@inject(AnalyticsIntegrationRepository)
		private repository: AnalyticsIntegrationRepository,
		@inject(CredentialEncryptionService)
		private encryptionService: CredentialEncryptionService,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(dto: TCreateAnalyticsIntegrationDto, user: TUser): Promise<TAnalyticsIntegration> {
		// Check if user already has an integration
		const existing = await this.repository.findOneByUserId(user.id);
		const currentCount = existing ? 1 : 0;

		const policy = new ManageAnalyticsIntegrationPolicy(user, currentCount);
		policy.checkAccess();

		const { encrypted, iv, tag } = this.encryptionService.encrypt(dto.credentials);

		const newId = this.repository.generateId();

		const integration: Omit<TAnalyticsIntegration, 'createdAt' | 'updatedAt'> = {
			id: newId,
			providerType: dto.providerType,
			encryptedCredentials: encrypted,
			encryptionIv: iv,
			encryptionTag: tag,
			isEnabled: true,
			lastError: null,
			lastErrorAt: null,
			consecutiveFailures: 0,
			createdBy: user.id,
		};

		await this.repository.create(integration);

		const created = await this.repository.findOneById(newId);
		if (!created) throw new Error('Failed to create analytics integration');

		this.logger.info('analyticsIntegration.created', {
			analyticsIntegration: {
				id: created.id,
				providerType: created.providerType,
				createdBy: created.createdBy,
			},
		});

		return created;
	}
}

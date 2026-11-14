import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import AnalyticsIntegrationRepository from '@/modules/analytics-integration/domain/repository/analytics-integration.repository';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import { HostedPageCacheService } from '@/modules/hosted-page/service/hosted-page-cache.service';

/**
 * Use case for disabling all Pro features for a user.
 * Called when the grace period expires after subscription cancellation.
 */
@injectable()
export class DisableProFeaturesUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(AnalyticsIntegrationRepository)
		private analyticsIntegrationRepository: AnalyticsIntegrationRepository,
		@inject(UserSubscriptionRepository)
		private userSubscriptionRepository: UserSubscriptionRepository,
		@inject(HostedPageCacheService) private hostedPageCache: HostedPageCacheService,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Disables all Pro features for a user and marks them as disabled.
	 * @param userId The ID of the user.
	 */
	async execute(userId: string): Promise<void> {
		// Disable all custom domains for this user
		await this.customDomainRepository.disableAllByUserId(userId);

		// Disable all analytics integrations for this user
		await this.analyticsIntegrationRepository.disableAllByUserId(userId);

		// Mark pro features as disabled on the subscription
		await this.userSubscriptionRepository.markProFeaturesDisabled(userId);

		// Hosted pages go offline with the Pro features; dropping the cache applies it on the next scan
		await this.hostedPageCache.invalidateUser(userId);

		this.logger.info('subscription.proFeaturesDisabled', { subscription: { userId } });
	}
}

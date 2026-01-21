import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import SubscriptionGracePeriodRepository from '../domain/repository/subscription-grace-period.repository';

/**
 * Use case for disabling all custom domains for a user.
 * Called when the grace period expires after subscription cancellation.
 */
@injectable()
export class DisableUserDomainsUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(SubscriptionGracePeriodRepository)
		private gracePeriodRepository: SubscriptionGracePeriodRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Disables all custom domains for a user and marks the grace period as processed.
	 * @param userId The ID of the user.
	 * @param gracePeriodId Optional ID of the grace period entry to mark as processed.
	 */
	async execute(userId: string, gracePeriodId?: string): Promise<void> {
		// Disable all custom domains for this user
		await this.customDomainRepository.disableAllByUserId(userId);

		// Mark grace period as processed if ID provided
		if (gracePeriodId) {
			await this.gracePeriodRepository.markAsProcessed(gracePeriodId);
		}

		this.logger.info('subscription.domainsDisabled', { subscription: { userId } });
	}
}

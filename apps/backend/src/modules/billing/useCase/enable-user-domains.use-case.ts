import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';

/**
 * Use case for enabling all custom domains for a user.
 * Called when a subscription becomes active (reactivation).
 */
@injectable()
export class EnableUserDomainsUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(UserSubscriptionRepository)
		private userSubscriptionRepository: UserSubscriptionRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Enables all custom domains for a user and clears any pending grace period.
	 * @param userId The ID of the user.
	 */
	async execute(userId: string): Promise<void> {
		// Enable all custom domains for this user
		await this.customDomainRepository.enableAllByUserId(userId);

		// Clear grace period fields on the subscription
		await this.userSubscriptionRepository.clearGracePeriod(userId);

		this.logger.info('subscription.domainsEnabled', { subscription: { userId } });
	}
}

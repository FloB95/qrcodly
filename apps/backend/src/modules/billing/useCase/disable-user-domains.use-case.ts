import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';

/**
 * Use case for disabling all custom domains for a user.
 * Called when the grace period expires after subscription cancellation.
 */
@injectable()
export class DisableUserDomainsUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(UserSubscriptionRepository)
		private userSubscriptionRepository: UserSubscriptionRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Disables all custom domains for a user and marks domains as disabled.
	 * @param userId The ID of the user.
	 */
	async execute(userId: string): Promise<void> {
		// Disable all custom domains for this user
		await this.customDomainRepository.disableAllByUserId(userId);

		// Mark domains as disabled on the subscription
		await this.userSubscriptionRepository.markDomainsDisabled(userId);

		this.logger.info('subscription.domainsDisabled', { subscription: { userId } });
	}
}

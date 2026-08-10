import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { type TUserAddonSubscription } from '../domain/entities/user-addon-subscription.entity';
import { EnforceCustomDomainLimitUseCase } from './enforce-custom-domain-limit.use-case';

export type TApplyPendingAddonQuantityResult = {
	quantity: number;
	/** Domain names that lost their slot as a result. */
	disabled: string[];
};

/**
 * Lands a scheduled quantity reduction once the paid period is over.
 *
 * Reached from two directions on purpose: the renewal webhook (which passes the quantity Stripe
 * reports, the authoritative value) and a daily sweep (which falls back to the value we stored
 * when the reduction was scheduled, in case that webhook never arrived).
 */
@injectable()
export class ApplyPendingAddonQuantityUseCase implements IBaseUseCase {
	constructor(
		@inject(UserAddonSubscriptionRepository)
		private addonSubscriptionRepository: UserAddonSubscriptionRepository,
		@inject(EnforceCustomDomainLimitUseCase)
		private enforceCustomDomainLimitUseCase: EnforceCustomDomainLimitUseCase,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(
		subscription: TUserAddonSubscription,
		options: { quantity?: number } = {},
	): Promise<TApplyPendingAddonQuantityResult> {
		const quantity = options.quantity ?? subscription.pendingQuantity ?? subscription.quantity;

		await this.addonSubscriptionRepository.update(subscription, {
			quantity,
			pendingQuantity: null,
			pendingQuantityEffectiveAt: null,
		});

		const { disabled } = await this.enforceCustomDomainLimitUseCase.execute(subscription.userId);

		this.logger.info('domainAddon.pendingQuantityApplied', {
			subscription: {
				userId: subscription.userId,
				previousQuantity: subscription.quantity,
				quantity,
				disabled,
			},
		});

		return { quantity, disabled };
	}
}

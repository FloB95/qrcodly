import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { StripeService } from '../service/stripe.service';

const ENDED_STATUSES = new Set(['canceled', 'incomplete_expired']);

/**
 * Ends everything a deleted user pays for: each subscription of their Stripe customer (Pro and the
 * domain add-on) is canceled at once, without a refund, then our copies are removed. The customer
 * itself stays in Stripe, because its invoices must be kept. When Stripe fails, the copies stay
 * too, so running this again picks up where it stopped.
 */
@injectable()
export class EndBillingOfDeletedUserUseCase implements IBaseUseCase {
	constructor(
		@inject(UserSubscriptionRepository)
		private readonly subscriptionRepository: UserSubscriptionRepository,
		@inject(UserAddonSubscriptionRepository)
		private readonly addonRepository: UserAddonSubscriptionRepository,
		@inject(StripeService) private readonly stripeService: StripeService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(userId: string): Promise<void> {
		const subscription = await this.subscriptionRepository.findByUserId(userId);
		const addons = await this.addonRepository.findAll({
			where: { userId: { eq: userId } },
			page: 1,
			limit: 100,
		});

		const customerIds = new Set(
			[subscription, ...addons].flatMap((row) => (row ? [row.stripeCustomerId] : [])),
		);
		for (const customerId of customerIds) {
			for (const stripeSubscription of await this.stripeService.listSubscriptionsForCustomer(
				customerId,
			)) {
				if (ENDED_STATUSES.has(stripeSubscription.status)) continue;
				await this.stripeService.cancelSubscriptionNow(stripeSubscription);
				this.logger.info('billing.subscription.canceled_for_deleted_user', {
					userId,
					stripe: { customerId, subscriptionId: stripeSubscription.id },
				});
			}
		}

		for (const addon of addons) {
			await this.addonRepository.delete(addon);
		}
		if (subscription) {
			await this.subscriptionRepository.delete(subscription);
		}
	}
}

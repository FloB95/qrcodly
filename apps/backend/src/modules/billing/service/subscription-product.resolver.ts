import { inject, singleton } from 'tsyringe';
import type Stripe from 'stripe';
import { isAddonDomainPriceId, isProPriceId } from '../config/stripe-prices';
import UserSubscriptionRepository from '../domain/repository/user-subscription.repository';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';

export type TSubscriptionProduct = 'pro' | 'domain_addon' | 'unknown';

/** Metadata we stamp onto checkout sessions and subscriptions we create ourselves. */
export const SUBSCRIPTION_PRODUCT_METADATA_KEY = 'product';
export const DOMAIN_ADDON_PRODUCT = 'domain_addon';

/**
 * Decides which product a Stripe subscription belongs to.
 *
 * A customer holds one Pro subscription and, optionally, an add-on subscription. Every webhook
 * and reconciliation path has to make this call before touching a table, or an add-on event ends
 * up rewriting the Pro record.
 */
@singleton()
export class SubscriptionProductResolver {
	constructor(
		@inject(UserSubscriptionRepository)
		private readonly userSubscriptionRepository: UserSubscriptionRepository,
		@inject(UserAddonSubscriptionRepository)
		private readonly addonSubscriptionRepository: UserAddonSubscriptionRepository,
	) {}

	resolveFromPriceId(priceId: string | null | undefined): TSubscriptionProduct {
		if (isProPriceId(priceId)) return 'pro';
		if (isAddonDomainPriceId(priceId)) return 'domain_addon';
		return 'unknown';
	}

	/**
	 * Price ID first because it is deterministic and shares its source of truth with the checkout
	 * allow-lists; metadata second so a renamed or legacy price still resolves; the local tables
	 * last as a fallback for subscriptions created before either was in place.
	 */
	async resolveFromSubscription(subscription: Stripe.Subscription): Promise<TSubscriptionProduct> {
		const byPrice = this.resolveFromPriceId(subscription.items?.data?.[0]?.price?.id);
		if (byPrice !== 'unknown') return byPrice;

		const declared = subscription.metadata?.[SUBSCRIPTION_PRODUCT_METADATA_KEY];
		if (declared === DOMAIN_ADDON_PRODUCT) return 'domain_addon';
		if (declared === 'pro') return 'pro';

		if (await this.addonSubscriptionRepository.findByStripeSubscriptionId(subscription.id)) {
			return 'domain_addon';
		}
		if (await this.userSubscriptionRepository.findByStripeSubscriptionId(subscription.id)) {
			return 'pro';
		}

		return 'unknown';
	}
}

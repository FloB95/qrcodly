import { env } from '@/core/config/env';

/**
 * Price IDs belonging to the Pro plan.
 *
 * A customer can hold more than one Stripe subscription (Pro plus add-ons), so
 * anything that consumes a subscription from Stripe has to tell them apart
 * before writing to a local table.
 */
export const PRO_PRICE_IDS: ReadonlySet<string> = new Set([
	env.STRIPE_PRO_PRICE_ID_MONTHLY,
	env.STRIPE_PRO_PRICE_ID_ANNUAL,
]);

/** Price IDs of the extra-custom-domain add-on. */
export const ADDON_DOMAIN_PRICE_IDS: ReadonlySet<string> = new Set([
	env.STRIPE_ADDON_DOMAIN_PRICE_ID_MONTHLY,
	env.STRIPE_ADDON_DOMAIN_PRICE_ID_ANNUAL,
]);

export function isProPriceId(priceId: string | null | undefined): boolean {
	return !!priceId && PRO_PRICE_IDS.has(priceId);
}

export function isAddonDomainPriceId(priceId: string | null | undefined): boolean {
	return !!priceId && ADDON_DOMAIN_PRICE_IDS.has(priceId);
}

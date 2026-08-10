import { env } from '@/env';

/**
 * Centralized plan configuration with translation keys.
 * Features are defined as translation keys that should be resolved using next-intl.
 */

export type PlanId = 'free' | 'pro';

export interface PlanConfig {
	id: PlanId;
	name: string;
	/** Translation keys for features */
	featureKeys: string[];
	featured: boolean;
}

/**
 * Plan configurations with feature translation keys.
 * Use with useTranslations('plans') to get translated feature strings.
 */
export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
	free: {
		id: 'free',
		name: 'Free',
		featureKeys: [
			'features.free.unlimitedQrCodes',
			'features.free.unlimitedShortUrls',
			'features.free.unlimitedTags',
			'features.free.staticDynamic',
			'features.free.customStyling',
			'features.free.detailedAnalytics',
			'features.free.noCreditCard',
			'features.free.limitedBulk',
		],
		featured: false,
	},
	pro: {
		id: 'pro',
		name: 'Pro',
		featureKeys: [
			'features.pro.everythingInFree',
			'features.pro.customDomains',
			'features.pro.customShortCodes',
			'features.pro.largerBulkImports',
			'features.pro.apiAccess',
			'features.pro.marketplaceIntegrations',
			'features.pro.prioritySupport',
			'features.pro.teamFeatures',
		],
		featured: true,
	},
};

/**
 * Per-feature info link. Rendered as a small info icon next to the feature
 * label that deep-links to the relevant docs / dashboard section.
 */
export const FEATURE_INFO_LINKS: Record<string, string> = {
	'features.pro.apiAccess': '/docs/api',
	'features.pro.marketplaceIntegrations': '/dashboard/settings/integrations',
};

/**
 * Prices for the extra-custom-domains add-on, per domain.
 *
 * Kept here so the pricing page, the purchase dialogs and the billing summary can never show
 * different numbers. German decimal formatting matches the rest of the pricing copy.
 */
const DOMAIN_ADDON_MONTHLY = '3,99';
const DOMAIN_ADDON_ANNUAL = '2,99';

export const DOMAIN_ADDON_PRICES = {
	monthly: DOMAIN_ADDON_MONTHLY,
	annual: DOMAIN_ADDON_ANNUAL,
	annualTotal: '35,88',
	/**
	 * The price quoted in "from …" calls to action: the cheapest way to buy, which is annual
	 * billing. The purchase dialog must therefore open on the annual cycle, or the CTA promises
	 * a price the first screen does not show.
	 */
	entry: DOMAIN_ADDON_ANNUAL,
} as const;

export function parsePrice(price: string): number {
	return Number(price.replace(',', '.'));
}

export function formatPrice(value: number): string {
	return value.toFixed(2).replace('.', ',');
}

/** Multiplies a German-formatted price string by a whole quantity, e.g. ('3,99', 2) -> '7,98'. */
export function multiplyPrice(price: string, quantity: number): string {
	const cents = Math.round(parsePrice(price) * 100) * quantity;
	return formatPrice(cents / 100);
}

export type TProPricing = {
	isAnnual: boolean;
	isLegacy: boolean;
	/** Monthly-equivalent price, so annual and monthly plans can be compared and summed. */
	monthlyPrice: string;
};

/**
 * Derives what a Pro subscriber actually pays from their Stripe price id, including the
 * grandfathered pricing. Shared so the plan card and the billing summary cannot drift apart.
 */
export function getProPricing(stripePriceId: string | null | undefined): TProPricing {
	const id = stripePriceId ?? '';
	const legacyIds = [
		env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY_LEGACY,
		env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL_LEGACY,
	].filter(Boolean);
	const annualIds = [
		env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL,
		env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL_LEGACY,
	].filter(Boolean);

	const isLegacy = legacyIds.includes(id);
	const isAnnual = annualIds.includes(id);

	return {
		isAnnual,
		isLegacy,
		monthlyPrice: isLegacy ? (isAnnual ? '4,00' : '4,99') : isAnnual ? '6,99' : '8,99',
	};
}

/**
 * Helper to get a plan config by ID
 */
export function getPlanConfig(planId: PlanId): PlanConfig {
	return PLAN_CONFIGS[planId];
}

/**
 * Helper to get feature translation key without the prefix
 */
export function getFeatureKey(fullKey: string): string {
	return fullKey;
}

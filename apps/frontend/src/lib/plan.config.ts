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
export const DOMAIN_ADDON_PRICES = {
	monthly: '3,99',
	annual: '2,99',
	annualTotal: '35,88',
} as const;

/** Multiplies a German-formatted price string by a whole quantity, e.g. ('3,99', 2) -> '7,98'. */
export function multiplyPrice(price: string, quantity: number): string {
	const cents = Math.round(Number(price.replace(',', '.')) * 100) * quantity;
	return (cents / 100).toFixed(2).replace('.', ',');
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

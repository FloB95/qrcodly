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
			'features.free.staticDynamic',
			'features.free.customStyling',
			'features.free.detailedAnalytics',
			'features.free.noCreditCard',
			'features.free.unlimitedTags',
			'features.free.limitedApi',
			'features.free.limitedBulk',
		],
		featured: false,
	},
	pro: {
		id: 'pro',
		name: 'Pro',
		featureKeys: [
			'features.pro.everythingInFree',
			'features.pro.unlimitedTags',
			'features.pro.customDomains',
			'features.pro.largerBulkImports',
			'features.pro.unlimitedApi',
			'features.pro.prioritySupport',
			// 'features.pro.teamFeatures',
		],
		featured: true,
	},
};

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

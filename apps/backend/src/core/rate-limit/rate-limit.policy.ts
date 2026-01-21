export enum RateLimitPolicy {
	DEFAULT = 'default',
	// qr code limits
	QR_CREATE = 'qr_create',
	BULK_QR_CREATE = 'bulk_qr_create',
	// template limits
	TEMPLATE_CREATE = 'template_create',
	SCREENSHOT_CREATE = 'screenshot_create',
	// custom domain limits
	DOMAIN_VERIFY = 'domain_verify',
}

export enum RateLimitTier {
	ANONYMOUS = 'anonymous',
	AUTHENTICATED = 'authenticated',
	PRO_PLAN = 'pro_plan',
}

type RateLimitTierLimits = {
	[K in RateLimitTier]: number;
};

type RateLimitPolicies = {
	[K in RateLimitPolicy]: RateLimitTierLimits;
};

export const RATE_LIMIT_POLICIES: RateLimitPolicies = {
	[RateLimitPolicy.DEFAULT]: {
		[RateLimitTier.ANONYMOUS]: 20,
		[RateLimitTier.AUTHENTICATED]: 80,
		[RateLimitTier.PRO_PLAN]: 120,
	},
	[RateLimitPolicy.QR_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 4,
		[RateLimitTier.AUTHENTICATED]: 15,
		[RateLimitTier.PRO_PLAN]: 30,
	},
	[RateLimitPolicy.BULK_QR_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 2,
		[RateLimitTier.PRO_PLAN]: 20,
	},
	[RateLimitPolicy.TEMPLATE_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 5,
		[RateLimitTier.PRO_PLAN]: 20,
	},
	[RateLimitPolicy.SCREENSHOT_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 3,
		[RateLimitTier.PRO_PLAN]: 10,
	},
	[RateLimitPolicy.DOMAIN_VERIFY]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 0,
		[RateLimitTier.PRO_PLAN]: 60,
	},
} as const;

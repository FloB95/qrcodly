export enum RateLimitPolicy {
	DEFAULT = 'default',
	// qr code limits
	QR_CREATE = 'qr_create',
	BULK_QR_CREATE = 'bulk_qr_create',
	// template limits
	TEMPLATE_CREATE = 'template_create',
	SCREENSHOT_CREATE = 'screenshot_create',
	QR_RENDER = 'qr_render',
	// tag limits
	TAG_CREATE = 'tag_create',
	// custom domain limits
	DOMAIN_VERIFY = 'domain_verify',
	DOMAIN_RESOLVE = 'domain_resolve',
	// survey limits
	SURVEY_SUBMIT = 'survey_submit',
	// scan limits
	SCAN_LOOKUP = 'scan_lookup',
	SCAN_RECORD = 'scan_record',
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
		[RateLimitTier.ANONYMOUS]: 30,
		[RateLimitTier.AUTHENTICATED]: 120,
		[RateLimitTier.PRO_PLAN]: 180,
	},
	[RateLimitPolicy.QR_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 4,
		[RateLimitTier.AUTHENTICATED]: 15,
		[RateLimitTier.PRO_PLAN]: 30,
	},
	[RateLimitPolicy.BULK_QR_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 2,
		[RateLimitTier.PRO_PLAN]: 10,
	},
	[RateLimitPolicy.TEMPLATE_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 5,
		[RateLimitTier.PRO_PLAN]: 20,
	},
	[RateLimitPolicy.TAG_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 5,
		[RateLimitTier.PRO_PLAN]: 20,
	},
	[RateLimitPolicy.SCREENSHOT_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 3,
		[RateLimitTier.PRO_PLAN]: 10,
	},
	[RateLimitPolicy.QR_RENDER]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 400,
		[RateLimitTier.PRO_PLAN]: 600,
	},
	[RateLimitPolicy.SURVEY_SUBMIT]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 5,
		[RateLimitTier.PRO_PLAN]: 5,
	},
	[RateLimitPolicy.DOMAIN_VERIFY]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 0,
		[RateLimitTier.PRO_PLAN]: 20,
	},
	[RateLimitPolicy.DOMAIN_RESOLVE]: {
		[RateLimitTier.ANONYMOUS]: 2000,
		[RateLimitTier.AUTHENTICATED]: 2000,
		[RateLimitTier.PRO_PLAN]: 2000,
	},
	[RateLimitPolicy.SCAN_LOOKUP]: {
		[RateLimitTier.ANONYMOUS]: 300,
		[RateLimitTier.AUTHENTICATED]: 300,
		[RateLimitTier.PRO_PLAN]: 300,
	},
	[RateLimitPolicy.SCAN_RECORD]: {
		[RateLimitTier.ANONYMOUS]: 200,
		[RateLimitTier.AUTHENTICATED]: 200,
		[RateLimitTier.PRO_PLAN]: 200,
	},
} as const;

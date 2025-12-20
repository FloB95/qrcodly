export enum RateLimitPolicy {
	DEFAULT = 'default',
	// qr code limits
	QR_CREATE = 'qr_create',
	BULK_QR_CREATE = 'bulk_qr_create',
	// template limits
	TEMPLATE_CREATE = 'template_create',
}

export enum RateLimitTier {
	ANONYMOUS = 'anonymous',
	AUTHENTICATED = 'authenticated',
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
	},
	[RateLimitPolicy.QR_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 4,
		[RateLimitTier.AUTHENTICATED]: 10,
	},
	[RateLimitPolicy.BULK_QR_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 2,
	},
	[RateLimitPolicy.TEMPLATE_CREATE]: {
		[RateLimitTier.ANONYMOUS]: 0,
		[RateLimitTier.AUTHENTICATED]: 5,
	},
} as const;

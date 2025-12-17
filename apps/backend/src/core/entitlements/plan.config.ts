export enum PlanName {
	ANONYMOUS = 'anonymous',
	FREE = 'free',
	PRO = 'pro',
}

export enum LimitKey {
	QR_CREATE_PER_DAY = 'qr.create.perDay',
}

type PlanConfig = {
	limits: Record<LimitKey, number>;
};

export const PLANS: Record<PlanName, PlanConfig> = {
	[PlanName.ANONYMOUS]: {
		limits: { [LimitKey.QR_CREATE_PER_DAY]: 1 },
	},
	[PlanName.FREE]: {
		limits: { [LimitKey.QR_CREATE_PER_DAY]: 10 },
	},
	[PlanName.PRO]: {
		limits: { [LimitKey.QR_CREATE_PER_DAY]: 100 },
	},
};

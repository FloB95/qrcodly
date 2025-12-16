import { type Entitlement } from './entitlement.types';

export type PlanConfig = {
	entitlements: readonly Entitlement[];
	limits: Record<string, number>;
};

export const PLANS: Record<string, PlanConfig> = {
	free: {
		entitlements: ['qr.create', 'qr.type.url'],
		limits: {
			'qr.create.perMonth': 10,
		},
	},

	pro: {
		entitlements: ['qr.create', 'qr.type.url', 'qr.type.vcard', 'qr.type.mp3'],
		limits: {
			'qr.create.perMonth': 1000,
		},
	},
};

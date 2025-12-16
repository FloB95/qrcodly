export const ENTITLEMENTS = [
	'qr.create',
	'qr.type.url',
	'qr.type.vcard',
	'qr.type.mp3',
	'api.access',
] as const;

export type Entitlement = (typeof ENTITLEMENTS)[number];

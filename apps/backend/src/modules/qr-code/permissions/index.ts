// will be used later for organization management

export const QR_CODE_PERMISSIONS = [
	'qrCode:list',
	'qrCode:read',
	'qrCode:write',
	'qrCode:update',
	'qrCode:delete',
] as const;

export type QrCodePermissions = (typeof QR_CODE_PERMISSIONS)[number];

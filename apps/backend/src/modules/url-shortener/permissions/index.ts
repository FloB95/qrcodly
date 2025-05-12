// will be used later for organization management

export const SHORT_URL_PERMISSIONS = [
	'shortUrl:list',
	'shortUrl:read',
	'shortUrl:write',
	'shortUrl:update',
	'shortUrl:delete',
] as const;

export type ShortUrlPermissions = (typeof SHORT_URL_PERMISSIONS)[number];

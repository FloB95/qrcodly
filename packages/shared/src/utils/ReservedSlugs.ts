export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
	'admin',
	'api',
	'app',
	'auth',
	'docs',
	'health',
	'login',
	'logout',
	'oauth',
	'preview',
	'public',
	'robots',
	'sitemap',
	'static',
	'system',
	'u',
	'webhook',
	'www',
]);

export function isReservedSlug(slug: string): boolean {
	return RESERVED_SLUGS.has(slug.toLowerCase());
}

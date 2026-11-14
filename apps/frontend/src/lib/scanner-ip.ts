/**
 * Visitor IP for calls the Next.js server makes on a visitor's behalf. cf-connecting-ip is set by
 * Cloudflare; the first X-Forwarded-For entry can be client-supplied and is only a fallback.
 */
export function scannerIpFrom(headers: Headers): string {
	return (
		headers.get('cf-connecting-ip')?.trim() ||
		headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		''
	);
}

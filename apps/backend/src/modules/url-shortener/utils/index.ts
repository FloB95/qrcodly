import { SHORT_BASE_URL } from '../config/constants';
import { env } from '@/core/config/env';

/**
 * Build the full short URL with the given code.
 * @param code - The short code
 * @param customDomainHost - Optional custom domain host (e.g., "my.custom.domain")
 * @returns The full short URL (e.g., "https://qrco.ly/u/abc12" or "https://my.custom.domain/u/abc12")
 */
export function buildShortUrl(code: string, customDomainHost?: string | null): string {
	if (customDomainHost) {
		return `https://${customDomainHost}/u/${code}`;
	}
	return `${SHORT_BASE_URL}${code}`;
}

function toHost(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return null;
	}
}

/**
 * True if `destinationUrl` points at any of our own `/u/<code>` redirect paths — on the dedicated
 * redirect domain (SHORT_URL_BASE_URL), the legacy brand domain (FRONTEND_URL), or the given custom
 * domain. Covers both the self-referencing case (a redirect loop) and chaining one short URL onto
 * another, which hides the real destination behind a hop that no safety check ever sees.
 * Host-set based rather than exact-string equality, so it stays correct across the domain split.
 * Best-effort: unparseable destinations return false.
 *
 * Residual: another user's custom domain is not in the host set, so a cross-tenant chain is not
 * caught here — that hop is itself screened when its own short URL is created or updated.
 */
export function isShortenedDestinationUrl(
	destinationUrl: string | null | undefined,
	customDomainHost?: string | null,
): boolean {
	if (!destinationUrl) return false;
	let parsed: URL;
	try {
		parsed = new URL(destinationUrl);
	} catch {
		return false;
	}
	if (!/^\/u\/[^/]+\/*$/.test(parsed.pathname)) return false;

	const hosts = new Set<string>();
	for (const url of [env.SHORT_URL_BASE_URL, env.FRONTEND_URL]) {
		const host = toHost(url);
		if (host) hosts.add(host);
	}
	if (customDomainHost) hosts.add(customDomainHost.replace(/^www\./, ''));

	return hosts.has(parsed.hostname.replace(/^www\./, ''));
}

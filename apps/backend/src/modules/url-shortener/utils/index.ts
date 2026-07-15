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
 * True if `destinationUrl` points back at this short URL's own `/u/<code>` path on any host we
 * serve redirects on — the dedicated redirect domain (SHORT_URL_BASE_URL), the legacy brand domain
 * (FRONTEND_URL), or the short URL's custom domain — which would create a redirect loop.
 * Host-set based rather than exact-string equality, so it stays correct across the domain split.
 * Best-effort: unparseable destinations return false.
 */
export function isSelfReferencingShortUrl(
	destinationUrl: string | null | undefined,
	shortCode: string,
	customDomainHost?: string | null,
): boolean {
	if (!destinationUrl) return false;
	let parsed: URL;
	try {
		parsed = new URL(destinationUrl);
	} catch {
		return false;
	}
	if (parsed.pathname.replace(/\/+$/, '') !== `/u/${shortCode}`) return false;

	const hosts = new Set<string>();
	for (const url of [env.SHORT_URL_BASE_URL, env.FRONTEND_URL]) {
		const host = toHost(url);
		if (host) hosts.add(host);
	}
	if (customDomainHost) hosts.add(customDomainHost.replace(/^www\./, ''));

	return hosts.has(parsed.hostname.replace(/^www\./, ''));
}

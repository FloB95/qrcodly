import { env } from '@/env';

/** Bare hostname (no port, no leading www) of a configured URL, or null if unset/invalid. */
export function normalizeHost(urlString: string | undefined): string | null {
	if (!urlString) return null;
	try {
		return new URL(urlString).hostname.replace(/^www\./, '');
	} catch {
		return null;
	}
}

export const brandHost = normalizeHost(env.NEXT_PUBLIC_FRONTEND_URL);
export const shortUrlHost = normalizeHost(env.NEXT_PUBLIC_SHORT_URL_DOMAIN);

/** Hostname of a Host header, lowercased and without port. */
export function hostnameOf(hostHeader: string | null): string {
	return (hostHeader ?? '').split(':')[0]?.toLowerCase() ?? '';
}

/** Whether a request with this Host header is on the host of `url`; port and www are ignored. */
export function isOnHostOf(url: string, hostHeader: string | null): boolean {
	const target = normalizeHost(url)?.toLowerCase();
	return !!target && hostnameOf(hostHeader).replace(/^www\./, '') === target;
}

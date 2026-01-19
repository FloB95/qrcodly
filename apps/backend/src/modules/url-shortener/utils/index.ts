import { SHORT_BASE_URL } from '../config/constants';

/**
 * Build the full short URL with the given code.
 * @param code - The short code
 * @param customDomainHost - Optional custom domain host (e.g., "my.custom.domain")
 * @returns The full short URL (e.g., "https://qrcodly.de/u/abc12" or "https://my.custom.domain/u/abc12")
 */
export function buildShortUrl(code: string, customDomainHost?: string | null): string {
	if (customDomainHost) {
		return `https://${customDomainHost}/u/${code}`;
	}
	return `${SHORT_BASE_URL}${code}`;
}

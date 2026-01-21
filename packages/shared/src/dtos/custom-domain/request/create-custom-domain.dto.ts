import { z } from 'zod';

/**
 * Subdomain validation regex - matches valid single-level subdomain names only.
 * Requires exactly 3 dot-separated segments: subdomain.domain.tld
 *
 * Examples:
 * - Valid: links.example.com, app.example.org
 * - Invalid: example.com (apex domain), sub.sub.example.com (multi-level subdomain)
 */
const subdomainRegex =
	/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;

/**
 * Helper to check if a domain is a single-level subdomain (not apex or multi-level).
 * Must have exactly 3 parts: subdomain.domain.tld
 */
function isSingleLevelSubdomain(domain: string): boolean {
	const parts = domain.split('.');
	// Exactly 3 parts: subdomain.domain.tld
	return parts.length === 3;
}

/**
 * Helper to check if domain contains qrcodly (blocked).
 */
function isQrcodlyDomain(domain: string): boolean {
	const lowerDomain = domain.toLowerCase();
	return lowerDomain.includes('qrcodly');
}

/**
 * DTO for creating a custom domain.
 * Only single-level subdomains are supported (e.g., links.example.com).
 * Apex domains (e.g., example.com) and multi-level subdomains (e.g., sub.sub.example.com) are not allowed.
 * QRcodly domains are blocked.
 */
export const CreateCustomDomainDto = z.object({
	domain: z
		.string()
		.trim()
		.toLowerCase()
		.min(3, 'Domain must be at least 3 characters')
		.max(255, 'Domain must be at most 255 characters')
		.refine((d) => !isQrcodlyDomain(d), {
			message: 'QRcodly domains cannot be used as custom domains.',
		})
		.refine((d) => subdomainRegex.test(d), {
			message: 'Invalid domain format. Please enter a valid subdomain.',
		})
		.refine(isSingleLevelSubdomain, {
			message:
				'Only single-level subdomains are supported (e.g., links.example.com). Multi-level subdomains (e.g., sub.sub.example.com) are not allowed.',
		}),
});

export type TCreateCustomDomainDto = z.infer<typeof CreateCustomDomainDto>;

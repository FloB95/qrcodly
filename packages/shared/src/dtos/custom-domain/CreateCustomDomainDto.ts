import { z } from 'zod';

/**
 * Subdomain validation regex - matches valid subdomain names only.
 * Requires at least 2 dot-separated segments before the TLD.
 *
 * Examples:
 * - Valid: links.example.com, app.links.example.com
 * - Invalid: example.com (apex domain), co.uk (just TLD)
 */
const subdomainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.){2,}[a-zA-Z]{2,}$/;

/**
 * Helper to check if a domain is a subdomain (not an apex domain).
 * A subdomain has at least 2 dots (e.g., sub.domain.tld).
 */
function isSubdomain(domain: string): boolean {
	const parts = domain.split('.');
	// Minimum 3 parts: subdomain.domain.tld
	return parts.length >= 3;
}

/**
 * DTO for creating a custom domain.
 * Only subdomains are supported (e.g., links.example.com).
 * Apex domains (e.g., example.com) are not allowed.
 */
export const CreateCustomDomainDto = z.object({
	domain: z
		.string()
		.min(3, 'Domain must be at least 3 characters')
		.max(255, 'Domain must be at most 255 characters')
		.regex(subdomainRegex, 'Invalid domain format')
		.transform((d) => d.toLowerCase().trim())
		.refine(isSubdomain, {
			message:
				'Only subdomains are supported (e.g., links.example.com). Apex domains are not allowed.',
		}),
});

export type TCreateCustomDomainDto = z.infer<typeof CreateCustomDomainDto>;

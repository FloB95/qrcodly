import { z } from 'zod';

/**
 * Domain validation regex - matches valid domain names.
 * Allows subdomains like links.example.com
 */
const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

/**
 * DTO for creating a custom domain.
 */
export const CreateCustomDomainDto = z.object({
	domain: z
		.string()
		.min(3, 'Domain must be at least 3 characters')
		.max(255, 'Domain must be at most 255 characters')
		.regex(domainRegex, 'Invalid domain format')
		.transform((d) => d.toLowerCase().trim()),
});

export type TCreateCustomDomainDto = z.infer<typeof CreateCustomDomainDto>;

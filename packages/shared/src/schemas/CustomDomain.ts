import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';

/**
 * Domain validation regex - matches valid domain names.
 * Allows subdomains like links.example.com
 */
const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

/**
 * Custom Domain schema for user-owned domains.
 */
export const CustomDomainSchema = AbstractEntitySchema.extend({
	domain: z.string().min(3).max(255).regex(domainRegex, 'Invalid domain format'),
	isVerified: z.boolean(),
	verificationToken: z.string().length(64),
	createdBy: z.string(),
});

export type TCustomDomain = z.infer<typeof CustomDomainSchema>;

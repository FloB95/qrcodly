import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';
import { CloudflareSSLStatusSchema } from '../dtos/custom-domain/types/ssl-status';
import { OwnershipStatusSchema } from '../dtos/custom-domain/types/ownership-status';

/**
 * Subdomain validation regex - matches valid subdomain names only.
 * Requires at least 2 dot-separated segments before the TLD.
 */
const subdomainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.){2,}[a-zA-Z]{2,}$/;

/**
 * Custom Domain schema for user-owned domains.
 * Integrated with Cloudflare Custom Hostnames.
 */
export const CustomDomainSchema = AbstractEntitySchema.extend({
	domain: z.string().min(3).max(255).regex(subdomainRegex, 'Invalid subdomain format'),
	isDefault: z.boolean(),
	createdBy: z.string(),
	// Cloudflare integration
	cloudflareHostnameId: z.string().nullable().optional(),
	sslStatus: CloudflareSSLStatusSchema,
	ownershipStatus: OwnershipStatusSchema,
	sslValidationTxtName: z.string().nullable().optional(),
	sslValidationTxtValue: z.string().nullable().optional(),
	ownershipValidationTxtName: z.string().nullable().optional(),
	ownershipValidationTxtValue: z.string().nullable().optional(),
});

export type TCustomDomain = z.infer<typeof CustomDomainSchema>;

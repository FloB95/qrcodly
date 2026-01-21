import { z } from 'zod';
import { AbstractEntitySchema } from '../../schemas/AbstractEntitySchema';

/**
 * SSL status values from Cloudflare Custom Hostnames API.
 */
export const CloudflareSSLStatusSchema = z.enum([
	'initializing',
	'pending_validation',
	'pending_issuance',
	'pending_deployment',
	'active',
	'pending_expiration',
	'expired',
	'deleted',
	'validation_timed_out',
]);

export type TCloudflareSSLStatus = z.infer<typeof CloudflareSSLStatusSchema>;

/**
 * Ownership verification status.
 */
export const OwnershipStatusSchema = z.enum(['pending', 'verified']);

export type TOwnershipStatus = z.infer<typeof OwnershipStatusSchema>;

/**
 * Validation record (TXT) from Cloudflare.
 */
export const ValidationRecordSchema = z.object({
	name: z.string(),
	value: z.string(),
});

export type TValidationRecord = z.infer<typeof ValidationRecordSchema>;

/**
 * Response DTO for custom domain.
 * Includes Cloudflare SSL and ownership verification status.
 */
export const CustomDomainResponseDto = AbstractEntitySchema.extend({
	domain: z.string(),
	isDefault: z.boolean(),
	isEnabled: z.boolean(),
	createdBy: z.string(),
	// Cloudflare integration fields
	cloudflareHostnameId: z.string().nullable().optional(),
	sslStatus: CloudflareSSLStatusSchema,
	ownershipStatus: OwnershipStatusSchema,
	// Validation records for user to add to DNS
	sslValidationRecord: ValidationRecordSchema.nullable().optional(),
	ownershipValidationRecord: ValidationRecordSchema.nullable().optional(),
	// Cloudflare validation errors (e.g., "custom hostname does not CNAME to this zone")
	validationErrors: z.array(z.string()).nullable().optional(),
});

export type TCustomDomainResponseDto = z.infer<typeof CustomDomainResponseDto>;

/**
 * Response DTO for custom domain list.
 */
export const CustomDomainListResponseDto = z.object({
	data: z.array(CustomDomainResponseDto),
	pagination: z.object({
		total: z.number(),
		page: z.number(),
		limit: z.number(),
		totalPages: z.number(),
	}),
});

export type TCustomDomainListResponseDto = z.infer<typeof CustomDomainListResponseDto>;

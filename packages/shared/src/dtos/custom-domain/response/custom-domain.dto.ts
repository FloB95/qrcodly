import { z } from 'zod';
import { AbstractEntitySchema } from '../../../schemas/AbstractEntitySchema';
import { VerificationPhaseSchema } from '../types/verification-phase';
import { CloudflareSSLStatusSchema } from '../types/ssl-status';
import { OwnershipStatusSchema } from '../types/ownership-status';
import { ValidationRecordSchema } from '../types/validation-record';

/**
 * Response DTO for custom domain.
 * Includes two-phase verification status and Cloudflare SSL status.
 */
export const CustomDomainResponseDto = AbstractEntitySchema.extend({
	domain: z.string(),
	isDefault: z.boolean(),
	isEnabled: z.boolean(),
	createdBy: z.string(),
	// Two-phase verification fields
	verificationPhase: VerificationPhaseSchema,
	ownershipTxtVerified: z.boolean(),
	cnameVerified: z.boolean(),
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

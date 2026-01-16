import { z } from 'zod';
import { AbstractEntitySchema } from '../../schemas/AbstractEntitySchema';

/**
 * Response DTO for custom domain.
 * Includes verification status and default setting.
 */
export const CustomDomainResponseDto = AbstractEntitySchema.extend({
	domain: z.string(),
	isVerified: z.boolean(),
	isCnameValid: z.boolean(),
	isDefault: z.boolean(),
	verificationToken: z.string(),
	createdBy: z.string(),
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

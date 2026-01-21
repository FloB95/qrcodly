import { z } from 'zod';

/**
 * Response DTO for domain resolution (used by Cloudflare Worker).
 * Returns whether a domain is valid and ready for use.
 */
export const ResolveDomainResponseDto = z.object({
	domain: z.string(),
	isValid: z.boolean(),
	sslStatus: z.string(),
});

export type TResolveDomainResponseDto = z.infer<typeof ResolveDomainResponseDto>;

/**
 * Query schema for domain resolution.
 */
export const ResolveDomainQueryDto = z.object({
	domain: z.string().min(1).max(255),
});

export type TResolveDomainQueryDto = z.infer<typeof ResolveDomainQueryDto>;

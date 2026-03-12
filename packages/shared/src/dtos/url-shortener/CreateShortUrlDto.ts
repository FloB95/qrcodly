import { z } from 'zod';
import { ShortUrlSchema } from '../../schemas/ShortUrl';

/**
 * Schema for creating a short URL DTO via the public API.
 * Uses z.httpUrl() at the API boundary to enforce http/https protocol for user-provided URLs.
 * destinationUrl is required (non-nullable) — only internal flows (reserved URLs) may set null.
 */
export const CreateShortUrlDto = ShortUrlSchema.pick({
	destinationUrl: true,
	isActive: true,
	customDomainId: true,
	name: true,
}).extend({
	destinationUrl: z.httpUrl(),
	isActive: z.boolean().default(true),
});

/**
 * Type definition for creating a short URL DTO.
 */
export type TCreateShortUrlDto = z.infer<typeof CreateShortUrlDto>;

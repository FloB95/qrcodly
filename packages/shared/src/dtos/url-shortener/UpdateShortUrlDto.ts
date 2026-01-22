import { type z } from 'zod';
import { ShortUrlSchema } from '../../schemas/ShortUrl';

/**
 * Schema for updating a short URL DTO.
 * Allows updating destination URL, active state, and custom domain.
 */
export const UpdateShortUrlDto = ShortUrlSchema.pick({
	destinationUrl: true,
	isActive: true,
	customDomainId: true,
}).partial();

/**
 * Type definition for updating a short URL DTO.
 */
export type TUpdateShortUrlDto = z.infer<typeof UpdateShortUrlDto>;

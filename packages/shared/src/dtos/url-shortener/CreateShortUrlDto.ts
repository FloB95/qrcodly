import { type z } from 'zod';
import { ShortUrlSchema } from '../../schemas/ShortUrl';

/**
 * Schema for creating a short URL DTO.
 * Optionally allows specifying a custom domain ID for the short URL.
 */
export const CreateShortUrlDto = ShortUrlSchema.pick({
	destinationUrl: true,
	isActive: true,
	customDomainId: true,
});

/**
 * Type definition for creating a short URL DTO.
 */
export type TCreateShortUrlDto = z.infer<typeof CreateShortUrlDto>;

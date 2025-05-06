import { type z } from 'zod';
import { ShortUrlSchema } from '../../schemas/ShortUrl';

/**
 * Schema for creating a short URL DTO.
 */
export const CreateShortUrlDto = ShortUrlSchema.pick({
	destinationUrl: true,
	isActive: true,
});

/**
 * Type definition for creating a short URL DTO.
 */
export type TCreateShortUrlDto = z.infer<typeof CreateShortUrlDto>;

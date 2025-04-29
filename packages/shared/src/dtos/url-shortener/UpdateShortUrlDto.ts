import { type z } from 'zod';
import { ShortUrlSchema } from '../../schemas/ShortUrl';

/**
 * Schema for updating a short URL DTO.
 */
export const UpdateShortUrlDto = ShortUrlSchema.pick({
	destinationUrl: true,
	qrCodeId: true,
	isActive: true,
}).partial();

/**
 * Type definition for updating a short URL DTO.
 */
export type TUpdateShortUrlDto = z.infer<typeof UpdateShortUrlDto>;

import { type z } from 'zod';
import { ShortUrlSchema } from '../../schemas/ShortUrl';

/**
 * Schema for the Short URL Response DTO.
 */
export const ShortUrlResponseDto = ShortUrlSchema;

/**
 * Type definition for the Short URL Response DTO.
 */
export type TShortUrlResponseDto = z.infer<typeof ShortUrlResponseDto>;

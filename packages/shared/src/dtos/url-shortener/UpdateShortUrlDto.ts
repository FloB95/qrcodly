import { z } from 'zod';
import { ShortUrlSchema } from '../../schemas/ShortUrl';
import { SafeHttpUrlSchema } from '../../schemas/SafeUrl';

/**
 * Schema for updating a short URL DTO via the public API.
 * Enforces http/https and rejects embedded credentials at the API boundary.
 * destinationUrl is non-nullable — once set, it cannot be cleared.
 * customDomainId is excluded — the domain cannot be changed after creation.
 * Note: Internal strategies (vCard, event) bypass Zod validation and only satisfy the TypeScript type.
 */
export const UpdateShortUrlDto = ShortUrlSchema.pick({
	destinationUrl: true,
	isActive: true,
	name: true,
})
	.extend({
		destinationUrl: SafeHttpUrlSchema.describe(
			'New destination URL (must start with http:// or https://)',
		),
	})
	.partial();

/**
 * Type definition for updating a short URL DTO.
 */
export type TUpdateShortUrlDto = z.infer<typeof UpdateShortUrlDto>;

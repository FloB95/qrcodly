import { z } from 'zod';
import { CustomSlugSchema, ShortUrlSchema } from '../../schemas/ShortUrl';

export const CreateShortUrlDto = ShortUrlSchema.pick({
	destinationUrl: true,
	isActive: true,
	customDomainId: true,
	name: true,
})
	.extend({
		destinationUrl: z
			.httpUrl()
			.describe('The destination URL to redirect to (must start with http:// or https://)'),
		isActive: z
			.boolean()
			.default(true)
			.describe('Whether the short URL should be active immediately (default: true)'),
		customSlug: CustomSlugSchema.nullable()
			.optional()
			.describe('Pro-only: pretty path. Requires customDomainId. Resolved alongside shortCode.'),
	})
	.refine((data) => !data.customSlug || !!data.customDomainId, {
		message: 'customSlug requires customDomainId',
		path: ['customSlug'],
	});

export type TCreateShortUrlDto = z.infer<typeof CreateShortUrlDto>;

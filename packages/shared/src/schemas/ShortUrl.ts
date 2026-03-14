import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';

export const ShortCodeSchema = z
	.string()
	.length(5)
	.describe('Unique 5-character short code (e.g. "Ab3xZ")');

export const ShortUrlSchema = AbstractEntitySchema.extend({
	shortCode: ShortCodeSchema,
	name: z
		.string()
		.max(255)
		.nullable()
		.default(null)
		.describe('User-defined name for the short URL'),
	destinationUrl: z.url().nullable().describe('The target URL that the short URL redirects to'),
	qrCodeId: z
		.uuid()
		.nullable()
		.describe('ID of the linked QR code, or null for standalone short URLs'),
	customDomainId: z
		.uuid()
		.nullable()
		.default(null)
		.describe('ID of the custom domain used for this short URL, or null for the default domain'),
	isActive: z.boolean().describe('Whether the short URL is currently active and redirecting'),
	createdBy: z.string().describe('User ID of the short URL owner'),
	deletedAt: z
		.preprocess((arg) => {
			if (arg instanceof Date) return arg.toISOString();
			return arg;
		}, z.iso.datetime().nullable())
		.default(null)
		.describe('Soft-delete timestamp, or null if the short URL is active'),
});

export type TShortUrl = z.infer<typeof ShortUrlSchema>;

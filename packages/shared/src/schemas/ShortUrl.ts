import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';
import { ShortUrlSafetyStatusSchema } from '../dtos/url-shortener/types/safety';

export const SHORT_URL_NAME_MAX_LENGTH = 50;

export const ShortCodeSchema = z
	.string()
	.length(5)
	.describe('Unique 5-character short code (e.g. "Ab3xZ")');

/** Coerces a Date (Drizzle) or an ISO string into a nullable ISO datetime. */
const nullableIsoDatetime = z
	.preprocess((arg) => {
		if (arg instanceof Date) return arg.toISOString();
		return arg;
	}, z.iso.datetime().nullable())
	.default(null);

export const ShortUrlSchema = AbstractEntitySchema.extend({
	shortCode: ShortCodeSchema,
	name: z
		.string()
		.max(SHORT_URL_NAME_MAX_LENGTH)
		.nullable()
		.default(null)
		.describe('User-defined name for the short URL (max 50 characters)'),
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
	deletedAt: nullableIsoDatetime.describe(
		'Soft-delete timestamp, or null if the short URL is active',
	),
	safetyStatus: ShortUrlSafetyStatusSchema.default('unchecked').describe(
		'Result of the destination safety screening. "blocked" means we disabled the link and the owner cannot re-enable it',
	),
	safetyBlockedAt: nullableIsoDatetime.describe(
		'When the link was blocked for safety reasons, or null',
	),
	safetyThreatTypes: z
		.string()
		.nullable()
		.default(null)
		.describe('Comma-separated Google Web Risk threat types behind the block, or null'),
});

export type TShortUrl = z.infer<typeof ShortUrlSchema>;

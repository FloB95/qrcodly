import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';

export const SHORT_URL_NAME_MAX_LENGTH = 50;

/**
 * Internal, system-generated short code. Always exactly 5 lowercase
 * alphanumeric characters. Globally unique. Used as the Umami tracking
 * path so analytics never collide across customers.
 */
export const ShortCodeSchema = z
	.string()
	.length(5)
	.describe('Unique 5-character short code (e.g. "ab3xz")');

export const CUSTOM_SLUG_MIN_LENGTH = 3;
export const CUSTOM_SLUG_MAX_LENGTH = 50;

const CUSTOM_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

/**
 * Optional user-chosen "pretty path" for a short URL. Pro-only and only
 * available for shortUrls on a custom domain. Lives alongside `shortCode`
 * (which is internal); the visitor URL is `/u/{customSlug}`. Unique per
 * custom domain among ACTIVE rows — once a row is soft-deleted, the slug
 * is freed for reuse, and Umami tracking remains tied to `shortCode`.
 */
export const CustomSlugSchema = z
	.string()
	.min(CUSTOM_SLUG_MIN_LENGTH)
	.max(CUSTOM_SLUG_MAX_LENGTH)
	.regex(CUSTOM_SLUG_PATTERN, {
		message: 'lowercase letters, digits, hyphens; no leading/trailing hyphen',
	})
	.refine((v) => !v.includes('--'), { message: 'no consecutive hyphens' });

export const ShortUrlSchema = AbstractEntitySchema.extend({
	shortCode: ShortCodeSchema,
	customSlug: CustomSlugSchema.nullable()
		.default(null)
		.describe('Pro-only display path; falls back to shortCode when absent'),
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
	deletedAt: z
		.preprocess((arg) => {
			if (arg instanceof Date) return arg.toISOString();
			return arg;
		}, z.iso.datetime().nullable())
		.default(null)
		.describe('Soft-delete timestamp, or null if the short URL is active'),
});

export type TShortUrl = z.infer<typeof ShortUrlSchema>;

import { relations } from 'drizzle-orm';
import { boolean, datetime, index, text, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';
import qrCode from './qr-code';
import customDomain, { type TCustomDomain } from './custom-domain';
import { type TTag } from './tag';
import shortUrlTag from './short-url-tag';

const shortUrl = createTable(
	'short_url',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		shortCode: varchar({ length: 5 }).notNull().unique(),
		name: varchar({ length: 255 }),
		destinationUrl: text(),
		qrCodeId: varchar({
			length: 36,
		})
			.references(() => qrCode.id, { onDelete: 'set null' })
			.unique(),
		customDomainId: varchar({
			length: 36,
		}).references(() => customDomain.id, { onDelete: 'set null' }),
		isActive: boolean().notNull(),
		createdBy: varchar({ length: 255 }).notNull(),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
		deletedAt: datetime(),
	},
	(t) => [
		// Composite index for list queries with sorting (ORDER BY createdAt DESC WHERE createdBy=?)
		index('i_short_url_created_by_created_at').on(t.createdBy, t.createdAt),
		index('i_short_url_qr_code_id').on(t.qrCodeId),
		// Composite index for reserved URL lookups (WHERE createdBy=? AND qrCodeId IS NULL AND destinationUrl IS NULL)
		index('i_short_url_reserved').on(t.createdBy, t.qrCodeId),
		// Index for custom domain lookups
		index('i_short_url_custom_domain_id').on(t.customDomainId),
	],
);

export type TShortUrl = typeof shortUrl.$inferSelect;
// Extended type that includes the custom domain name (for API responses)
export type TShortUrlWithDomain = TShortUrl & {
	customDomain: TCustomDomain | null;
};
// Extended type that includes custom domain and tags
export type TShortUrlWithDomainAndTags = TShortUrlWithDomain & {
	tags: TTag[];
};
export default shortUrl;

// Relation Definition for shortUrl
export const shortUrlRelations = relations(shortUrl, ({ one, many }) => ({
	qrCode: one(qrCode, {
		fields: [shortUrl.qrCodeId],
		references: [qrCode.id],
	}),
	customDomain: one(customDomain, {
		fields: [shortUrl.customDomainId],
		references: [customDomain.id],
	}),
	shortUrlTags: many(shortUrlTag),
}));

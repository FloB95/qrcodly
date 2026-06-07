import { relations, sql } from 'drizzle-orm';
import { boolean, datetime, index, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
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
		// Internal, system-generated 5-char code. Globally unique across the
		// entire system. Used as the Umami tracking path so analytics never
		// collide across customers, even if they choose identical custom slugs.
		shortCode: varchar({ length: 5 }).notNull().unique(),
		// Optional user-chosen "pretty path" displayed at /u/{customSlug} on a
		// custom domain. Resolved separately from shortCode at request time.
		// Must be unique per (customDomainId) for active rows; soft-deleted rows
		// are excluded from the constraint via the customSlugKey trick below.
		customSlug: varchar({ length: 50 }),
		name: varchar({ length: 50 }),
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
		// VIRTUAL key that enforces "one ACTIVE customSlug per customDomain":
		//   - row has no slug                → key = id            (no constraint)
		//   - row is soft-deleted            → key = '__deleted__:'+id (no constraint)
		//   - active row WITH slug           → key = '<domainOrNone>:<slug>'
		// Composing on customDomainId + customSlug means the same slug can exist
		// on different domains, but only one ACTIVE per (domain, slug). Once a
		// row is soft-deleted, the slug is freed for reuse.
		customSlugKey: varchar({ length: 320 })
			.generatedAlwaysAs(
				sql`CASE
					WHEN \`custom_slug\` IS NULL THEN \`id\`
					WHEN \`deleted_at\` IS NOT NULL THEN CONCAT('__deleted__:', \`id\`)
					ELSE CONCAT(COALESCE(\`custom_domain_id\`, '__none__'), ':', \`custom_slug\`)
				END`,
				{ mode: 'virtual' },
			)
			.notNull(),
	},
	(t) => [
		uniqueIndex('unique_active_custom_slug_per_domain').on(t.customSlugKey),
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
export type TShortUrlWithDomain = TShortUrl & {
	customDomain: TCustomDomain | null;
};
export type TShortUrlWithDomainAndTags = TShortUrlWithDomain & {
	tags: TTag[];
};
export default shortUrl;

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

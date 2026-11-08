import { type THostedPageBody, type THostedPageType } from '@shared/schemas';
import { relations } from 'drizzle-orm';
import { datetime, index, json, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';
import shortUrl from './short-url';

/**
 * A page QRcodly serves itself (PDF today; audio and business cards later). Its address is a short
 * URL pointing at it (`short_url.hosted_page_id`); a QR code is only one way to reach that address,
 * so a page can exist without one. Active, blocked and domain state stay on the link.
 * Deleted pages are soft deleted and purged with their files after the retention period.
 */
const hostedPage = createTable(
	'hosted_page',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		createdBy: varchar({ length: 255 }).notNull(),
		type: varchar({ length: 16 }).$type<THostedPageType>().notNull(),
		data: json().$type<THostedPageBody['data']>().notNull(),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
		deletedAt: datetime(),
	},
	(t) => [index('i_hosted_page_created_by_created_at').on(t.createdBy, t.createdAt)],
);

export type THostedPage = typeof hostedPage.$inferSelect;
export default hostedPage;

export const hostedPageRelations = relations(hostedPage, ({ one }) => ({
	shortUrl: one(shortUrl, {
		fields: [hostedPage.id],
		references: [shortUrl.hostedPageId],
	}),
}));

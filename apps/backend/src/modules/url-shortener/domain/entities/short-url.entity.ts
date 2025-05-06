import { qrCode } from '@/core/db/schemas';
import { createTable } from '@/core/db/utils';
import { relations } from 'drizzle-orm';
import { boolean, datetime, index, text, varchar } from 'drizzle-orm/mysql-core';

const shortUrl = createTable(
	'short_url',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		shortCode: varchar({ length: 5 }).notNull().unique(),
		destinationUrl: text(),
		qrCodeId: varchar({
			length: 36,
		})
			.references(() => qrCode.id, { onDelete: 'cascade' })
			.unique(),
		isActive: boolean().notNull(),
		createdBy: varchar({ length: 255 }).notNull(),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
	},
	(t) => [
		index('i_short_url_created_by').on(t.createdBy),
		index('i_short_url_qr_code_id').on(t.qrCodeId),
	],
);

export type TShortUrl = typeof shortUrl.$inferSelect;
export default shortUrl;

// Relation Definition for shortUrl
export const shortUrlRelations = relations(shortUrl, ({ one }) => ({
	qrCode: one(qrCode, {
		fields: [shortUrl.qrCodeId],
		references: [qrCode.id],
	}),
}));

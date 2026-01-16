import { shortUrl } from '@/core/db/schemas';
import { createTable } from '@/core/db/utils';
import { type TShortUrl, type TQrCodeContent, type TQrCodeOptions } from '@shared/schemas';
import { relations } from 'drizzle-orm';
import { datetime, index, json, text, varchar } from 'drizzle-orm/mysql-core';

const qrCode = createTable(
	'qr_code',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		name: varchar({ length: 255 }),
		config: json().$type<TQrCodeOptions>().notNull(),
		content: json().$type<TQrCodeContent>().notNull(),
		qrCodeData: text(),
		previewImage: text(),
		createdBy: varchar({ length: 255 }),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
	},
	(t) => [
		// Composite index for list queries with sorting (ORDER BY createdAt DESC WHERE createdBy=?)
		index('i_qr_code_created_by_created_at').on(t.createdBy, t.createdAt),
	],
);

export type TQrCode = typeof qrCode.$inferSelect;
export type TQrCodeWithRelations = TQrCode & {
	shortUrl: TShortUrl | null;
};
export default qrCode;

// Relation Definition for qrCode
export const qrCodeRelations = relations(qrCode, ({ one }) => ({
	shortUrl: one(shortUrl, {
		fields: [qrCode.id],
		references: [shortUrl.qrCodeId],
	}),
}));

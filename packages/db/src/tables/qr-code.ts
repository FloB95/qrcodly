import {
	type TQrCodeContent,
	type TQrCodeOptions,
	type TStoredQrCodeContent,
} from '@shared/schemas';
import { relations } from 'drizzle-orm';
import { datetime, index, json, text, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';
import shortUrl, { type TShortUrl } from './short-url';
import qrCodeShare, { type TQrCodeShare } from './qr-code-share';
import qrCodeTag from './qr-code-tag';
import { type TTag } from './tag';

const qrCode = createTable(
	'qr_code',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		name: varchar({ length: 50 }),
		config: json().$type<TQrCodeOptions>().notNull(),
		/** For hosted types only the type: the page lives in `hosted_page`, see `TQrCode` */
		content: json().$type<TStoredQrCodeContent>().notNull(),
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

/** A row as stored: hosted content is a stub. Only the QR code repository reads rows. */
export type TQrCodeRow = typeof qrCode.$inferSelect;
/** A QR code with its full content, hosted pages loaded in. */
export type TQrCode = Omit<TQrCodeRow, 'content'> & { content: TQrCodeContent };
export type TQrCodeWithRelations = TQrCode & {
	shortUrl: TShortUrl | null;
	share: TQrCodeShare | null;
	tags: TTag[];
};
export default qrCode;

// Relation Definition for qrCode
export const qrCodeRelations = relations(qrCode, ({ one, many }) => ({
	shortUrl: one(shortUrl, {
		fields: [qrCode.id],
		references: [shortUrl.qrCodeId],
	}),
	share: one(qrCodeShare, {
		fields: [qrCode.id],
		references: [qrCodeShare.qrCodeId],
	}),
	qrCodeTags: many(qrCodeTag),
}));

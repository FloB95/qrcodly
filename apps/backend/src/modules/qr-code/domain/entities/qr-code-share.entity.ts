import { qrCode } from '@/core/db/schemas';
import { createTable } from '@/core/db/utils';
import { type TQrCodeShareConfig } from '@shared/schemas';
import { relations } from 'drizzle-orm';
import { boolean, datetime, index, json, varchar } from 'drizzle-orm/mysql-core';
import { type TQrCode } from './qr-code.entity';

const qrCodeShare = createTable(
	'qr_code_share',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		qrCodeId: varchar('qr_code_id', {
			length: 36,
		})
			.references(() => qrCode.id, { onDelete: 'cascade' })
			.notNull()
			.unique(), // Currently one share per QR code (can be removed later for multiple shares)
		shareToken: varchar('share_token', { length: 21 }).notNull().unique(),
		config: json().$type<TQrCodeShareConfig>().notNull(),
		isActive: boolean('is_active').notNull().default(true),
		createdBy: varchar('created_by', { length: 255 }).notNull(),
		createdAt: datetime('created_at').notNull(),
		updatedAt: datetime('updated_at'),
	},
	(t) => [
		index('i_qr_code_share_qr_code_id').on(t.qrCodeId),
		index('i_qr_code_share_token').on(t.shareToken),
		index('i_qr_code_share_created_by').on(t.createdBy),
	],
);

export type TQrCodeShare = typeof qrCodeShare.$inferSelect;
export type TQrCodeShareWithQrCode = TQrCodeShare & {
	qrCode: TQrCode;
};
export default qrCodeShare;

// Relation Definition for qrCodeShare
export const qrCodeShareRelations = relations(qrCodeShare, ({ one }) => ({
	qrCode: one(qrCode, {
		fields: [qrCodeShare.qrCodeId],
		references: [qrCode.id],
	}),
}));

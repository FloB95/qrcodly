import { createTable } from '@/core/db/utils';
import { relations } from 'drizzle-orm';
import { index, primaryKey, varchar } from 'drizzle-orm/mysql-core';
import tag from './tag.entity';
import { qrCode } from '@/core/db/schemas';

const qrCodeTag = createTable(
	'qr_code_tag',
	{
		qrCodeId: varchar('qr_code_id', { length: 36 })
			.notNull()
			.references(() => qrCode.id, { onDelete: 'cascade' }),
		tagId: varchar('tag_id', { length: 36 })
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' }),
	},
	(t) => [
		primaryKey({ columns: [t.qrCodeId, t.tagId] }),
		index('i_qr_code_tag_tag_id').on(t.tagId),
	],
);

export type TQrCodeTag = typeof qrCodeTag.$inferSelect;
export default qrCodeTag;

export const qrCodeTagRelations = relations(qrCodeTag, ({ one }) => ({
	qrCode: one(qrCode, {
		fields: [qrCodeTag.qrCodeId],
		references: [qrCode.id],
	}),
	tag: one(tag, {
		fields: [qrCodeTag.tagId],
		references: [tag.id],
	}),
}));

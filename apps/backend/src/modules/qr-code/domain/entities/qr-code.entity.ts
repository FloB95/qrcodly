import { createTable } from '@/core/db/utils';
import { type TQrCodeContent, type TQrCodeOptions } from '@shared/schemas';
import { datetime, index, json, text, varchar } from 'drizzle-orm/mysql-core';

const qrCode = createTable(
	'qr_code',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		config: json().$type<TQrCodeOptions>().notNull(),
		content: json().$type<TQrCodeContent>().notNull(),
		previewImage: text(),
		createdBy: varchar({ length: 255 }),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
	},
	(t) => [index('i_qr_code_created_by').on(t.createdBy)],
);

export type TQrCode = typeof qrCode.$inferSelect;
export default qrCode;

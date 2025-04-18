import { createTable } from '@/core/db/utils';
import { datetime, index, json, varchar } from 'drizzle-orm/mysql-core';
import {
	type TQrCodeContent,
	type TQrCodeContentType,
	type TQrCodeOptions,
} from '../schemas/QrCode';

export const qrCode = createTable(
	'qr_code',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		config: json().$type<TQrCodeOptions>().notNull(),
		contentType: varchar({ length: 255 }).$type<TQrCodeContentType>().notNull(),
		content: json().$type<TQrCodeContent>().notNull(),
		createdBy: varchar({ length: 255 }),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
	},
	(t) => [index('i_qr_code_created_by').on(t.createdBy)],
);

export type TQrCode = typeof qrCode.$inferSelect;
export default qrCode;

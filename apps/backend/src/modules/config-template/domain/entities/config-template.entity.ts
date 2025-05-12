import { createTable } from '@/core/db/utils';
import { type TQrCodeOptions } from '@shared/schemas';
import { boolean, datetime, index, json, text, varchar } from 'drizzle-orm/mysql-core';

const configTemplate = createTable(
	'qr_code_config_template',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		name: varchar({ length: 255 }).notNull(),
		config: json().$type<TQrCodeOptions>().notNull(),
		previewImage: text(),
		isPredefined: boolean().default(false).notNull(),
		createdBy: varchar({ length: 255 }),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
	},
	(t) => [index('i_config_template_created_by').on(t.createdBy)],
);

export type TConfigTemplate = typeof configTemplate.$inferSelect;
export default configTemplate;

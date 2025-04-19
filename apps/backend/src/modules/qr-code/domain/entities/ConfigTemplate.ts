import { createTable } from '@/core/db/utils';
import { type TQrCodeOptions } from '@shared/schemas';
import { datetime, index, json, varchar } from 'drizzle-orm/mysql-core';

const configTemplate = createTable(
	'qr_code_config_template',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		name: varchar('name', { length: 255 }).notNull(),
		config: json('config').$type<TQrCodeOptions>().notNull(),
		createdBy: varchar({ length: 255 }),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
	},
	(t) => [index('i_config_template_created_by').on(t.createdBy)],
);

export type TConfigTemplate = typeof configTemplate.$inferSelect;
export default configTemplate;

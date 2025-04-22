import { createTable } from '@/core/db/utils';
import { datetime, index, text, varchar } from 'drizzle-orm/mysql-core';

const shortUrl = createTable(
	'short_url',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		shortCode: varchar({ length: 5 }).notNull().unique(),
		destinationUrl: text(),
		createdBy: varchar({ length: 255 }).notNull(),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
	},
	(t) => [index('i_short_url_created_by').on(t.createdBy)],
);

export type TShortUrl = typeof shortUrl.$inferSelect;
export default shortUrl;

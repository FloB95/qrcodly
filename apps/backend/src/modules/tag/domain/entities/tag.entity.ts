import { createTable } from '@/core/db/utils';
import { relations } from 'drizzle-orm';
import { datetime, index, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import qrCodeTag from './qr-code-tag.entity';

const tag = createTable(
	'tag',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		name: varchar({ length: 50 }).notNull(),
		color: varchar({ length: 7 }).notNull(),
		createdBy: varchar('created_by', { length: 255 }).notNull(),
		createdAt: datetime('created_at').notNull(),
		updatedAt: datetime('updated_at'),
	},
	(t) => [
		index('i_tag_created_by_created_at').on(t.createdBy, t.createdAt),
		uniqueIndex('i_tag_created_by_name').on(t.createdBy, t.name),
	],
);

export type TTag = typeof tag.$inferSelect;
export default tag;

export const tagRelations = relations(tag, ({ many }) => ({
	qrCodeTags: many(qrCodeTag),
}));

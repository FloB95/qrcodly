import { createTable } from '@/core/db/utils';
import { relations } from 'drizzle-orm';
import { index, primaryKey, varchar } from 'drizzle-orm/mysql-core';
import tag from '@/modules/tag/domain/entities/tag.entity';
import shortUrl from './short-url.entity';

const shortUrlTag = createTable(
	'short_url_tag',
	{
		shortUrlId: varchar('short_url_id', { length: 36 })
			.notNull()
			.references(() => shortUrl.id, { onDelete: 'cascade' }),
		tagId: varchar('tag_id', { length: 36 })
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' }),
	},
	(t) => [
		primaryKey({ columns: [t.shortUrlId, t.tagId] }),
		index('i_short_url_tag_tag_id').on(t.tagId),
		index('i_short_url_tag_short_url_id').on(t.shortUrlId),
	],
);

export type TShortUrlTag = typeof shortUrlTag.$inferSelect;
export default shortUrlTag;

export const shortUrlTagRelations = relations(shortUrlTag, ({ one }) => ({
	shortUrl: one(shortUrl, {
		fields: [shortUrlTag.shortUrlId],
		references: [shortUrl.id],
	}),
	tag: one(tag, {
		fields: [shortUrlTag.tagId],
		references: [tag.id],
	}),
}));

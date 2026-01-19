import { createTable } from '@/core/db/utils';
import { relations } from 'drizzle-orm';
import { boolean, datetime, index, varchar } from 'drizzle-orm/mysql-core';

/**
 * Custom Domain entity for user-owned domains.
 * Users can add their own domains for dynamic QR codes.
 */
const customDomain = createTable(
	'custom_domain',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		domain: varchar({ length: 255 }).notNull().unique(),
		isVerified: boolean().notNull().default(false),
		isCnameValid: boolean().notNull().default(false),
		isDefault: boolean().notNull().default(false),
		verificationToken: varchar({ length: 64 }).notNull(),
		createdBy: varchar({ length: 255 }).notNull(),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
	},
	(t) => [
		// Composite index for list queries with sorting (ORDER BY createdAt DESC WHERE createdBy=?)
		index('i_custom_domain_created_by_created_at').on(t.createdBy, t.createdAt),
		// Index for domain lookups
		index('i_custom_domain_domain').on(t.domain),
	],
);

export type TCustomDomain = typeof customDomain.$inferSelect;
export default customDomain;

// Relation Definition for customDomain (placeholder for future relations)
export const customDomainRelations = relations(customDomain, () => ({}));

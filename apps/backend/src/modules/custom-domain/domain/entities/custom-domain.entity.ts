import { createTable } from '@/core/db/utils';
import { relations } from 'drizzle-orm';
import { boolean, datetime, index, text, varchar } from 'drizzle-orm/mysql-core';

/**
 * SSL status values from Cloudflare Custom Hostnames API.
 */
export type TCloudflareSSLStatus =
	| 'initializing'
	| 'pending_validation'
	| 'pending_issuance'
	| 'pending_deployment'
	| 'active'
	| 'pending_expiration'
	| 'expired'
	| 'deleted'
	| 'validation_timed_out';

/**
 * Ownership verification status.
 */
export type TOwnershipStatus = 'pending' | 'verified';

/**
 * Custom Domain entity for user-owned domains.
 * Users can add their own domains for dynamic QR codes.
 * Integrated with Cloudflare Custom Hostnames API for SSL and verification.
 */
const customDomain = createTable(
	'custom_domain',
	{
		id: varchar('id', {
			length: 36,
		}).primaryKey(),
		domain: varchar({ length: 255 }).notNull().unique(),
		isDefault: boolean().notNull().default(false),
		isEnabled: boolean().notNull().default(true),
		createdBy: varchar({ length: 255 }).notNull(),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
		// Cloudflare Custom Hostname fields
		cloudflareHostnameId: varchar({ length: 36 }),
		sslStatus: varchar({ length: 50 }).notNull().default('initializing'),
		ownershipStatus: varchar({ length: 50 }).notNull().default('pending'),
		// Cloudflare-provided validation records (stored for display to user)
		sslValidationTxtName: varchar({ length: 255 }),
		sslValidationTxtValue: varchar({ length: 500 }),
		ownershipValidationTxtName: varchar({ length: 255 }),
		ownershipValidationTxtValue: varchar({ length: 500 }),
		// Cloudflare validation errors (JSON array of error messages)
		validationErrors: text(),
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

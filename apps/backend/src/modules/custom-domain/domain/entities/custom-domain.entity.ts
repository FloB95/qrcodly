import { createTable } from '@/core/db/utils';
import { relations } from 'drizzle-orm';
import { boolean, datetime, index, mysqlEnum, text, varchar } from 'drizzle-orm/mysql-core';

/**
 * Verification phase values for the two-step verification flow.
 * - dns_verification: User needs to add ownership TXT + CNAME records
 * - cloudflare_ssl: DNS verified, waiting for Cloudflare SSL provisioning
 */
export const VERIFICATION_PHASES = ['dns_verification', 'cloudflare_ssl'] as const;
export type TVerificationPhase = (typeof VERIFICATION_PHASES)[number];

/**
 * SSL status values from Cloudflare Custom Hostnames API.
 */
export const SSL_STATUSES = [
	'initializing',
	'pending_validation',
	'pending_issuance',
	'pending_deployment',
	'active',
	'pending_expiration',
	'expired',
	'deleted',
	'validation_timed_out',
] as const;
export type TCloudflareSSLStatus = (typeof SSL_STATUSES)[number];

/**
 * Ownership verification status values.
 */
export const OWNERSHIP_STATUSES = ['pending', 'verified'] as const;
export type TOwnershipStatus = (typeof OWNERSHIP_STATUSES)[number];

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
		// Two-phase verification fields (using MySQL ENUM for type safety)
		verificationPhase: mysqlEnum('verification_phase', VERIFICATION_PHASES)
			.notNull()
			.default('dns_verification'),
		ownershipTxtVerified: boolean().notNull().default(false),
		cnameVerified: boolean().notNull().default(false),
		// Cloudflare Custom Hostname fields (using MySQL ENUM for type safety)
		cloudflareHostnameId: varchar({ length: 36 }),
		sslStatus: mysqlEnum('ssl_status', SSL_STATUSES).notNull().default('initializing'),
		ownershipStatus: mysqlEnum('ownership_status', OWNERSHIP_STATUSES).notNull().default('pending'),
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

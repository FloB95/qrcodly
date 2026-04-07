import { relations } from 'drizzle-orm';
import { boolean, datetime, index, int, mysqlEnum, text, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';

export const PROVIDER_TYPES = ['google_analytics', 'matomo'] as const;
export type TProviderType = (typeof PROVIDER_TYPES)[number];

const analyticsIntegration = createTable(
	'analytics_integration',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		providerType: mysqlEnum('provider_type', PROVIDER_TYPES).notNull(),
		encryptedCredentials: text('encrypted_credentials').notNull(),
		encryptionIv: varchar('encryption_iv', { length: 32 }).notNull(),
		encryptionTag: varchar('encryption_tag', { length: 32 }).notNull(),
		isEnabled: boolean('is_enabled').notNull().default(true),
		lastError: text('last_error'),
		lastErrorAt: datetime('last_error_at'),
		consecutiveFailures: int('consecutive_failures').notNull().default(0),
		createdBy: varchar('created_by', { length: 255 }).notNull(),
		createdAt: datetime('created_at').notNull(),
		updatedAt: datetime('updated_at'),
	},
	(t) => [
		index('i_analytics_integration_created_by').on(t.createdBy),
		index('i_analytics_integration_created_by_enabled').on(t.createdBy, t.isEnabled),
	],
);

export type TAnalyticsIntegration = typeof analyticsIntegration.$inferSelect;
export default analyticsIntegration;

export const analyticsIntegrationRelations = relations(analyticsIntegration, () => ({}));

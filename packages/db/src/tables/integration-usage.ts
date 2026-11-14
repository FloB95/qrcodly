import { datetime, index, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';

/**
 * Which clients (web app, desktop app, browser extension, design plugins, MCP server, plain API)
 * each user works with. One row per user and client; `client` is a value of `API_CLIENTS` from
 * `@shared/schemas`, kept as varchar so new clients need no migration.
 */
const integrationUsage = createTable(
	'integration_usage',
	{
		id: varchar({ length: 36 }).primaryKey(),
		userId: varchar({ length: 255 }).notNull(),
		client: varchar({ length: 32 }).notNull(),
		lastVersion: varchar({ length: 32 }),
		firstSeenAt: datetime().notNull(),
		lastSeenAt: datetime().notNull(),
	},
	(t) => [
		uniqueIndex('u_integration_usage_user_client').on(t.userId, t.client),
		index('i_integration_usage_client').on(t.client),
	],
);

export type TIntegrationUsage = typeof integrationUsage.$inferSelect;
export default integrationUsage;

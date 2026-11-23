import { datetime, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';

/**
 * IP addresses or CIDR ranges whose scans are left out of the owner's analytics, e.g. their
 * company network. Applies to every short URL of the account.
 */
const scanIpExclusion = createTable(
	'scan_ip_exclusion',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		ipRange: varchar('ip_range', { length: 64 }).notNull(),
		label: varchar('label', { length: 100 }),
		createdBy: varchar('created_by', { length: 255 }).notNull(),
		createdAt: datetime('created_at').notNull(),
		updatedAt: datetime('updated_at'),
	},
	(t) => [uniqueIndex('u_scan_ip_exclusion_created_by_ip_range').on(t.createdBy, t.ipRange)],
);

export type TScanIpExclusion = typeof scanIpExclusion.$inferSelect;
export default scanIpExclusion;

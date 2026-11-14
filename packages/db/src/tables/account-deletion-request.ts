import { datetime, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';

/**
 * One row per user. A request is active while `revoked_at` is null; requesting again after a
 * revocation reuses the row. Kept in our own database because Clerk's `user.deleted` webhook
 * carries only the user id, so a cleanup reacting to it can still check for a request here.
 */
const accountDeletionRequest = createTable(
	'account_deletion_request',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar('user_id', { length: 255 }).notNull(),
		requestedAt: datetime('requested_at').notNull(),
		revokedAt: datetime('revoked_at'),
	},
	(t) => [uniqueIndex('i_account_deletion_request_user_id').on(t.userId)],
);

export type TAccountDeletionRequest = typeof accountDeletionRequest.$inferSelect;
export default accountDeletionRequest;

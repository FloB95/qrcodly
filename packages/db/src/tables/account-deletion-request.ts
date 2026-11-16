import { datetime, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';

/**
 * One row per user. A request is open while `revoked_at` is null, and it only counts once the user
 * confirmed it through the link we mailed them (`confirmed_at`). Requesting again after a
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
		confirmedAt: datetime('confirmed_at'),
		// SHA-256 of the secret in the confirmation link; the secret itself is never stored
		confirmationTokenHash: varchar('confirmation_token_hash', { length: 64 }),
		confirmationExpiresAt: datetime('confirmation_expires_at'),
	},
	(t) => [uniqueIndex('i_account_deletion_request_user_id').on(t.userId)],
);

export type TAccountDeletionRequest = typeof accountDeletionRequest.$inferSelect;
export default accountDeletionRequest;

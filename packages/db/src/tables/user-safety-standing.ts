import { relations } from 'drizzle-orm';
import { datetime, index, int, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';

/**
 * Per-user standing for the warn→ban escalation ladder.
 *
 * Deliberately a database table rather than a Redis counter: the previous implementation kept
 * strikes only in Redis, so a cache flush silently reset every user's history — an evasion path —
 * and nothing about it was queryable for reporting.
 */
const userSafetyStanding = createTable(
	'user_safety_standing',
	{
		userId: varchar({ length: 255 }).primaryKey(),
		/** Offences inside the rolling window; reset once the window lapses. */
		offenceCount: int().notNull().default(0),
		firstOffenceAt: datetime(),
		lastOffenceAt: datetime(),
		/** Set on the first offence — the next one escalates to a ban. */
		warnedAt: datetime(),
		/** Null when the warning mail could not be delivered, so it stays visible as a gap. */
		warningEmailSentAt: datetime(),
		bannedAt: datetime(),
		createdAt: datetime().notNull(),
		updatedAt: datetime(),
	},
	(t) => [index('i_user_safety_standing_last_offence').on(t.lastOffenceAt)],
);

export type TUserSafetyStanding = typeof userSafetyStanding.$inferSelect;
export default userSafetyStanding;

export const userSafetyStandingRelations = relations(userSafetyStanding, () => ({}));

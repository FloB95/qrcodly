import { createTable } from '@/core/db/utils';
import { datetime, index, varchar } from 'drizzle-orm/mysql-core';

/**
 * Subscription grace period entity.
 * Tracks users whose subscription has ended and are in the grace period.
 * After the grace period expires, their custom domains will be disabled.
 */
const subscriptionGracePeriod = createTable(
	'subscription_grace_period',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar({ length: 255 }).notNull().unique(),
		email: varchar({ length: 255 }).notNull(),
		firstName: varchar({ length: 255 }),
		gracePeriodEndsAt: datetime().notNull(),
		createdAt: datetime().notNull(),
		processedAt: datetime(),
	},
	(t) => [
		index('i_subscription_grace_period_ends_at').on(t.gracePeriodEndsAt),
		index('i_subscription_grace_period_user_id').on(t.userId),
	],
);

export type TSubscriptionGracePeriod = typeof subscriptionGracePeriod.$inferSelect;
export default subscriptionGracePeriod;

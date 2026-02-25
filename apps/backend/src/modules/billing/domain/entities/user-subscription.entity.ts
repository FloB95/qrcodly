import { createTable } from '@/core/db/utils';
import { boolean, datetime, index, varchar } from 'drizzle-orm/mysql-core';

const userSubscription = createTable(
	'user_subscription',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar({ length: 255 }).notNull().unique(),
		stripeCustomerId: varchar({ length: 255 }).notNull(),
		stripeSubscriptionId: varchar({ length: 255 }).notNull().unique(),
		stripePriceId: varchar({ length: 255 }).notNull(),
		status: varchar({ length: 50 }).notNull(), // active, past_due, canceled, unpaid, trialing, incomplete
		currentPeriodStart: datetime().notNull(),
		currentPeriodEnd: datetime().notNull(),
		cancelAtPeriodEnd: boolean().notNull().default(false),
		gracePeriodEndsAt: datetime(),
		domainsDisabledAt: datetime(),
		cancellationNotifiedAt: datetime(),
		cancellationReminderSentAt: datetime(),
		pastDueNotifiedAt: datetime(),
		createdAt: datetime().notNull(),
		updatedAt: datetime().notNull(),
	},
	(t) => [
		index('i_user_subscription_user_id').on(t.userId),
		index('i_user_subscription_stripe_customer_id').on(t.stripeCustomerId),
		index('i_user_subscription_stripe_subscription_id').on(t.stripeSubscriptionId),
		index('i_user_subscription_status').on(t.status),
		index('i_user_subscription_grace_period_ends_at').on(t.gracePeriodEndsAt),
	],
);

export type TUserSubscription = typeof userSubscription.$inferSelect;
export default userSubscription;

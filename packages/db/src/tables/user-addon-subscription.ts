import {
	boolean,
	datetime,
	index,
	int,
	mysqlEnum,
	uniqueIndex,
	varchar,
} from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';

/**
 * Add-on products a user can subscribe to on top of the Pro plan.
 */
export const ADDON_TYPES = ['custom_domain'] as const;
export type TAddonType = (typeof ADDON_TYPES)[number];

/**
 * A Stripe subscription for a purchasable add-on, held alongside the user's Pro
 * subscription in `user_subscription`.
 *
 * Kept in its own table because `user_subscription.userId` is unique and is read on
 * the plan-entitlement hot path — a product discriminator there would have to be
 * threaded through every query, and one omission grants Pro for free.
 */
const userAddonSubscription = createTable(
	'user_addon_subscription',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar({ length: 255 }).notNull(),
		addonType: mysqlEnum('addon_type', ADDON_TYPES).notNull(),
		stripeCustomerId: varchar({ length: 255 }).notNull(),
		stripeSubscriptionId: varchar({ length: 255 }).notNull().unique(),
		stripePriceId: varchar({ length: 255 }).notNull(),
		status: varchar({ length: 50 }).notNull(), // active, past_due, canceled, unpaid, trialing, incomplete
		/** Slots the user is entitled to right now. */
		quantity: int().notNull().default(0),
		/**
		 * A reduction takes effect at the end of the paid period, so Stripe already holds the
		 * lower quantity while the user still has the higher one. This pair is the only record
		 * of that gap — never overwrite `quantity` from a webhook while it is set.
		 */
		pendingQuantity: int(),
		pendingQuantityEffectiveAt: datetime(),
		currentPeriodStart: datetime().notNull(),
		currentPeriodEnd: datetime().notNull(),
		cancelAtPeriodEnd: boolean().notNull().default(false),
		gracePeriodEndsAt: datetime(),
		addonFeaturesDisabledAt: datetime(),
		cancellationNotifiedAt: datetime(),
		cancellationReminderSentAt: datetime(),
		pastDueNotifiedAt: datetime(),
		/** `event.created` of the last applied Stripe event; guards against out-of-order delivery. */
		lastStripeEventAt: datetime(),
		createdAt: datetime().notNull(),
		updatedAt: datetime().notNull(),
	},
	(t) => [
		uniqueIndex('u_user_addon_subscription_user_type').on(t.userId, t.addonType),
		index('i_user_addon_subscription_stripe_customer_id').on(t.stripeCustomerId),
		index('i_user_addon_subscription_status').on(t.status),
		index('i_user_addon_subscription_grace_period_ends_at').on(t.gracePeriodEndsAt),
		index('i_user_addon_subscription_pending_effective_at').on(t.pendingQuantityEffectiveAt),
	],
);

export type TUserAddonSubscription = typeof userAddonSubscription.$inferSelect;
export default userAddonSubscription;

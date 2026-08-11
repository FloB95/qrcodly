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
		/** Slots the user is entitled to. Mirrors the Stripe subscription item's quantity. */
		quantity: int().notNull().default(0),
		currentPeriodStart: datetime().notNull(),
		currentPeriodEnd: datetime().notNull(),
		cancelAtPeriodEnd: boolean().notNull().default(false),
		/**
		 * Mirror of a Stripe subscription schedule holding a reduction that takes effect at the end
		 * of the paid period. Stripe performs the switch; these columns only let the UI name it
		 * without a round trip, so they are always rewritten from `subscription.schedule`.
		 */
		stripeScheduleId: varchar({ length: 255 }),
		scheduledQuantity: int(),
		scheduledQuantityEffectiveAt: datetime(),
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
		// `subscription_schedule.released` carries no subscription id, only the schedule's own.
		index('i_user_addon_subscription_stripe_schedule_id').on(t.stripeScheduleId),
	],
);

export type TUserAddonSubscription = typeof userAddonSubscription.$inferSelect;
export default userAddonSubscription;

import { singleton } from 'tsyringe';
import { and, desc, eq, gte, isNotNull, isNull, lte, ne } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import userAddonSubscription, {
	type TAddonType,
	type TUserAddonSubscription,
} from '../entities/user-addon-subscription.entity';

/** A reduction parked in a Stripe subscription schedule, as mirrored locally. */
export type TScheduledQuantityChange = {
	stripeScheduleId: string;
	quantity: number;
	effectiveAt: Date;
};

/** Fields owned by Stripe. Everything else is our own lifecycle bookkeeping. */
export type TAddonSubscriptionSyncData = {
	userId: string;
	addonType: TAddonType;
	stripeCustomerId: string;
	stripeSubscriptionId: string;
	stripePriceId: string;
	status: string;
	quantity: number;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	cancelAtPeriodEnd: boolean;
	lastStripeEventAt?: Date | null;
	/**
	 * Three-valued on purpose: omit to leave the mirror alone, `null` to clear it, an object to
	 * overwrite it. A caller that only knows about the subscription must not wipe a schedule it
	 * never looked at.
	 */
	scheduledChange?: TScheduledQuantityChange | null;
};

/** Columns holding the schedule mirror, in the shape the table expects. */
function scheduledChangeColumns(change: TScheduledQuantityChange | null) {
	return {
		stripeScheduleId: change?.stripeScheduleId ?? null,
		scheduledQuantity: change?.quantity ?? null,
		scheduledQuantityEffectiveAt: change?.effectiveAt ?? null,
	};
}

@singleton()
class UserAddonSubscriptionRepository extends AbstractRepository<TUserAddonSubscription> {
	table = userAddonSubscription;

	constructor() {
		super();
	}

	async findAll({
		limit,
		page,
		where,
	}: ISqlQueryFindBy<TUserAddonSubscription>): Promise<TUserAddonSubscription[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();
		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);
		return await query.execute();
	}

	async findOneById(id: string): Promise<TUserAddonSubscription | undefined> {
		return this.db.query.userAddonSubscription.findFirst({
			where: eq(this.table.id, id),
		});
	}

	async findByUserAndType(
		userId: string,
		addonType: TAddonType,
	): Promise<TUserAddonSubscription | undefined> {
		return this.db.query.userAddonSubscription.findFirst({
			where: and(eq(this.table.userId, userId), eq(this.table.addonType, addonType)),
		});
	}

	async findByStripeSubscriptionId(
		stripeSubscriptionId: string,
	): Promise<TUserAddonSubscription | undefined> {
		return this.db.query.userAddonSubscription.findFirst({
			where: eq(this.table.stripeSubscriptionId, stripeSubscriptionId),
		});
	}

	/**
	 * Lookup path for `subscription_schedule.released`, whose payload carries no subscription id.
	 */
	async findByStripeScheduleId(
		stripeScheduleId: string,
	): Promise<TUserAddonSubscription | undefined> {
		return this.db.query.userAddonSubscription.findFirst({
			where: eq(this.table.stripeScheduleId, stripeScheduleId),
		});
	}

	/**
	 * Every add-on row regardless of status, for the reconciliation sweep.
	 *
	 * Canceled rows have to be included: buying again after a cancellation reuses the row, and
	 * skipping it would leave the new subscription unnoticed whenever its webhook is lost.
	 */
	async findAllForReconciliation(): Promise<TUserAddonSubscription[]> {
		return this.db.select().from(this.table).execute();
	}

	async findAllNonCanceled(): Promise<TUserAddonSubscription[]> {
		return this.db.select().from(this.table).where(ne(this.table.status, 'canceled')).execute();
	}

	/**
	 * Writes the Stripe-owned fields for a user's add-on, creating the row if needed.
	 *
	 * Deliberately a find-then-update rather than `onDuplicateKeyUpdate`: cancel-and-rebuy is a
	 * normal add-on lifecycle, and the row must adopt the new `stripeSubscriptionId` when it
	 * happens or every later webhook for that subscription is dropped as unknown.
	 */
	async upsertByUserAndType(data: TAddonSubscriptionSyncData): Promise<TUserAddonSubscription> {
		const now = new Date();
		const existing = await this.findByUserAndType(data.userId, data.addonType);

		if (existing) {
			await this.db
				.update(this.table)
				.set({
					stripeCustomerId: data.stripeCustomerId,
					stripeSubscriptionId: data.stripeSubscriptionId,
					stripePriceId: data.stripePriceId,
					status: data.status,
					quantity: data.quantity,
					currentPeriodStart: data.currentPeriodStart,
					currentPeriodEnd: data.currentPeriodEnd,
					cancelAtPeriodEnd: data.cancelAtPeriodEnd,
					lastStripeEventAt: data.lastStripeEventAt ?? existing.lastStripeEventAt,
					...(data.scheduledChange !== undefined
						? scheduledChangeColumns(data.scheduledChange)
						: {}),
					updatedAt: now,
				})
				.where(eq(this.table.id, existing.id))
				.execute();
		} else {
			await this.db
				.insert(this.table)
				.values({
					id: crypto.randomUUID(),
					userId: data.userId,
					addonType: data.addonType,
					stripeCustomerId: data.stripeCustomerId,
					stripeSubscriptionId: data.stripeSubscriptionId,
					stripePriceId: data.stripePriceId,
					status: data.status,
					quantity: data.quantity,
					currentPeriodStart: data.currentPeriodStart,
					currentPeriodEnd: data.currentPeriodEnd,
					cancelAtPeriodEnd: data.cancelAtPeriodEnd,
					lastStripeEventAt: data.lastStripeEventAt ?? null,
					...scheduledChangeColumns(data.scheduledChange ?? null),
					createdAt: now,
					updatedAt: now,
				})
				.execute();
		}

		const row = await this.findByUserAndType(data.userId, data.addonType);
		if (!row) {
			throw new Error(`Failed to persist add-on subscription for user ${data.userId}`);
		}
		return row;
	}

	async create(
		subscription: Omit<TUserAddonSubscription, 'createdAt' | 'updatedAt'>,
	): Promise<void> {
		const now = new Date();
		await this.db
			.insert(this.table)
			.values({ ...subscription, createdAt: now, updatedAt: now })
			.execute();
	}

	async update(
		subscription: TUserAddonSubscription,
		updates: Partial<TUserAddonSubscription>,
	): Promise<void> {
		await this.db
			.update(this.table)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(this.table.id, subscription.id))
			.execute();
	}

	async findExpiredUnprocessedGracePeriods(): Promise<TUserAddonSubscription[]> {
		return this.db
			.select()
			.from(this.table)
			.where(
				and(
					isNotNull(this.table.gracePeriodEndsAt),
					lte(this.table.gracePeriodEndsAt, new Date()),
					isNull(this.table.addonFeaturesDisabledAt),
					eq(this.table.status, 'canceled'),
				),
			)
			.execute();
	}

	async findPendingCancellationReminders(daysBeforeEnd: number): Promise<TUserAddonSubscription[]> {
		const now = new Date();
		const threshold = new Date(now);
		threshold.setDate(threshold.getDate() + daysBeforeEnd);

		return this.db
			.select()
			.from(this.table)
			.where(
				and(
					eq(this.table.cancelAtPeriodEnd, true),
					eq(this.table.status, 'active'),
					gte(this.table.currentPeriodEnd, now),
					lte(this.table.currentPeriodEnd, threshold),
					isNull(this.table.cancellationReminderSentAt),
				),
			)
			.execute();
	}

	async setScheduledQuantity(
		subscription: TUserAddonSubscription,
		change: TScheduledQuantityChange,
	): Promise<void> {
		await this.update(subscription, scheduledChangeColumns(change));
	}

	async clearScheduledQuantity(subscription: TUserAddonSubscription): Promise<void> {
		// Also clears the reminder marker, so a reduction scheduled again later is announced again.
		await this.update(subscription, {
			...scheduledChangeColumns(null),
			cancellationReminderSentAt: null,
		});
	}

	/**
	 * Add-ons whose parked reduction is about to take effect and that have not been reminded yet.
	 *
	 * Shares `cancellationReminderSentAt` with the cancellation reminder: the two states are
	 * mutually exclusive by construction, since cancelling releases the schedule and a quantity
	 * change is refused while the add-on is set to end.
	 */
	async findPendingReductionReminders(
		daysBeforeEffective: number,
	): Promise<TUserAddonSubscription[]> {
		const now = new Date();
		const threshold = new Date(now);
		threshold.setDate(threshold.getDate() + daysBeforeEffective);

		return this.db
			.select()
			.from(this.table)
			.where(
				and(
					isNotNull(this.table.scheduledQuantityEffectiveAt),
					eq(this.table.status, 'active'),
					eq(this.table.cancelAtPeriodEnd, false),
					gte(this.table.scheduledQuantityEffectiveAt, now),
					lte(this.table.scheduledQuantityEffectiveAt, threshold),
					isNull(this.table.cancellationReminderSentAt),
				),
			)
			.execute();
	}

	async markAddonFeaturesDisabled(subscription: TUserAddonSubscription): Promise<void> {
		await this.update(subscription, { addonFeaturesDisabledAt: new Date() });
	}

	async clearGracePeriod(subscription: TUserAddonSubscription): Promise<void> {
		await this.update(subscription, {
			gracePeriodEndsAt: null,
			addonFeaturesDisabledAt: null,
			cancellationNotifiedAt: null,
			cancellationReminderSentAt: null,
			pastDueNotifiedAt: null,
		});
	}

	async markCancellationNotified(subscription: TUserAddonSubscription): Promise<void> {
		await this.update(subscription, { cancellationNotifiedAt: new Date() });
	}

	async markCancellationReminderSent(subscription: TUserAddonSubscription): Promise<void> {
		await this.update(subscription, { cancellationReminderSentAt: new Date() });
	}

	async clearCancellationNotifications(subscription: TUserAddonSubscription): Promise<void> {
		await this.update(subscription, {
			cancellationNotifiedAt: null,
			cancellationReminderSentAt: null,
		});
	}

	async markPastDueNotified(subscription: TUserAddonSubscription): Promise<void> {
		await this.update(subscription, { pastDueNotifiedAt: new Date() });
	}

	async clearPastDueNotification(subscription: TUserAddonSubscription): Promise<void> {
		await this.update(subscription, { pastDueNotifiedAt: null });
	}

	async delete(subscription: TUserAddonSubscription): Promise<true> {
		await this.db.delete(this.table).where(eq(this.table.id, subscription.id)).execute();
		return true;
	}
}

export default UserAddonSubscriptionRepository;

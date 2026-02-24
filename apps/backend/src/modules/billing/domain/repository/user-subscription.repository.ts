import { singleton } from 'tsyringe';
import { and, desc, eq, isNotNull, isNull, lte, ne } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import userSubscription, { type TUserSubscription } from '../entities/user-subscription.entity';

@singleton()
class UserSubscriptionRepository extends AbstractRepository<TUserSubscription> {
	table = userSubscription;

	constructor() {
		super();
	}

	async findAll({
		limit,
		page,
		where,
	}: ISqlQueryFindBy<TUserSubscription>): Promise<TUserSubscription[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();
		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);
		return await query.execute();
	}

	async findOneById(id: string): Promise<TUserSubscription | undefined> {
		const result = await this.db.query.userSubscription.findFirst({
			where: eq(this.table.id, id),
		});
		return result;
	}

	async findByUserId(userId: string): Promise<TUserSubscription | undefined> {
		const result = await this.db.query.userSubscription.findFirst({
			where: eq(this.table.userId, userId),
		});
		return result;
	}

	async findByStripeSubscriptionId(
		stripeSubscriptionId: string,
	): Promise<TUserSubscription | undefined> {
		const result = await this.db.query.userSubscription.findFirst({
			where: eq(this.table.stripeSubscriptionId, stripeSubscriptionId),
		});
		return result;
	}

	async findAllNonCanceled(): Promise<TUserSubscription[]> {
		return this.db.select().from(this.table).where(ne(this.table.status, 'canceled')).execute();
	}

	async findByStripeCustomerId(stripeCustomerId: string): Promise<TUserSubscription | undefined> {
		const result = await this.db.query.userSubscription.findFirst({
			where: eq(this.table.stripeCustomerId, stripeCustomerId),
		});
		return result;
	}

	async upsertByStripeSubscriptionId(
		data: Omit<
			TUserSubscription,
			| 'createdAt'
			| 'gracePeriodEndsAt'
			| 'domainsDisabledAt'
			| 'cancellationNotifiedAt'
			| 'cancellationReminderSentAt'
		>,
	): Promise<void> {
		const existing = await this.findByStripeSubscriptionId(data.stripeSubscriptionId);
		const now = new Date();

		if (existing) {
			const { id: _id, ...updates } = data;
			await this.db
				.update(this.table)
				.set({
					...updates,
					updatedAt: now,
				})
				.where(eq(this.table.stripeSubscriptionId, data.stripeSubscriptionId))
				.execute();
		} else {
			await this.db
				.insert(this.table)
				.values({
					...data,
					createdAt: now,
					updatedAt: now,
				})
				.execute();
		}
	}

	async create(subscription: Omit<TUserSubscription, 'createdAt' | 'updatedAt'>): Promise<void> {
		const now = new Date();
		await this.db
			.insert(this.table)
			.values({
				...subscription,
				createdAt: now,
				updatedAt: now,
			})
			.execute();
	}

	async update(
		subscription: TUserSubscription,
		updates: Partial<TUserSubscription>,
	): Promise<void> {
		await this.db
			.update(this.table)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(this.table.id, subscription.id))
			.execute();
	}

	async findExpiredUnprocessedGracePeriods(): Promise<TUserSubscription[]> {
		const now = new Date();
		return this.db
			.select()
			.from(this.table)
			.where(
				and(
					isNotNull(this.table.gracePeriodEndsAt),
					lte(this.table.gracePeriodEndsAt, now),
					isNull(this.table.domainsDisabledAt),
					eq(this.table.status, 'canceled'),
				),
			)
			.execute();
	}

	async markDomainsDisabled(userId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({ domainsDisabledAt: new Date(), updatedAt: new Date() })
			.where(eq(this.table.userId, userId))
			.execute();
	}

	async clearGracePeriod(userId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({
				gracePeriodEndsAt: null,
				domainsDisabledAt: null,
				cancellationNotifiedAt: null,
				cancellationReminderSentAt: null,
				updatedAt: new Date(),
			})
			.where(eq(this.table.userId, userId))
			.execute();
	}

	async markCancellationNotified(userId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({ cancellationNotifiedAt: new Date(), updatedAt: new Date() })
			.where(eq(this.table.userId, userId))
			.execute();
	}

	async markCancellationReminderSent(userId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({ cancellationReminderSentAt: new Date(), updatedAt: new Date() })
			.where(eq(this.table.userId, userId))
			.execute();
	}

	async clearCancellationNotifications(userId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({
				cancellationNotifiedAt: null,
				cancellationReminderSentAt: null,
				updatedAt: new Date(),
			})
			.where(eq(this.table.userId, userId))
			.execute();
	}

	async findPendingCancellationReminders(daysBeforeEnd: number): Promise<TUserSubscription[]> {
		const threshold = new Date();
		threshold.setDate(threshold.getDate() + daysBeforeEnd);

		return this.db
			.select()
			.from(this.table)
			.where(
				and(
					eq(this.table.cancelAtPeriodEnd, true),
					eq(this.table.status, 'active'),
					lte(this.table.currentPeriodEnd, threshold),
					isNull(this.table.cancellationReminderSentAt),
				),
			)
			.execute();
	}

	async delete(subscription: TUserSubscription): Promise<true> {
		await this.db.delete(this.table).where(eq(this.table.id, subscription.id)).execute();
		return true;
	}
}

export default UserSubscriptionRepository;

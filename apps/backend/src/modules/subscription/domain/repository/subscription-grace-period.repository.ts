import { singleton } from 'tsyringe';
import { and, desc, eq, isNull, lte } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import subscriptionGracePeriod, {
	TSubscriptionGracePeriod,
} from '../entities/subscription-grace-period.entity';

/**
 * Repository for managing Subscription Grace Period entities.
 */
@singleton()
class SubscriptionGracePeriodRepository extends AbstractRepository<TSubscriptionGracePeriod> {
	table = subscriptionGracePeriod;

	constructor() {
		super();
	}

	async findAll({
		limit,
		page,
		where,
	}: ISqlQueryFindBy<TSubscriptionGracePeriod>): Promise<TSubscriptionGracePeriod[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();

		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);

		return await query.execute();
	}

	async findOneById(id: string): Promise<TSubscriptionGracePeriod | undefined> {
		const result = await this.db.query.subscriptionGracePeriod.findFirst({
			where: eq(this.table.id, id),
		});
		return result;
	}

	async findByUserId(userId: string): Promise<TSubscriptionGracePeriod | undefined> {
		const result = await this.db.query.subscriptionGracePeriod.findFirst({
			where: eq(this.table.userId, userId),
		});
		return result;
	}

	async findExpiredUnprocessed(): Promise<TSubscriptionGracePeriod[]> {
		const now = new Date();
		const result = await this.db
			.select()
			.from(this.table)
			.where(and(lte(this.table.gracePeriodEndsAt, now), isNull(this.table.processedAt)))
			.execute();

		return result;
	}

	async create(
		gracePeriod: Omit<TSubscriptionGracePeriod, 'createdAt' | 'processedAt'>,
	): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				...gracePeriod,
				createdAt: new Date(),
			})
			.execute();
	}

	async update(
		gracePeriod: TSubscriptionGracePeriod,
		updates: Partial<TSubscriptionGracePeriod>,
	): Promise<void> {
		await this.db
			.update(this.table)
			.set(updates)
			.where(eq(this.table.id, gracePeriod.id))
			.execute();
	}

	async markAsProcessed(id: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({ processedAt: new Date() })
			.where(eq(this.table.id, id))
			.execute();
	}

	async delete(gracePeriod: TSubscriptionGracePeriod): Promise<true> {
		await this.db.delete(this.table).where(eq(this.table.id, gracePeriod.id)).execute();
		return true;
	}

	async deleteByUserId(userId: string): Promise<true> {
		await this.db.delete(this.table).where(eq(this.table.userId, userId)).execute();
		return true;
	}
}

export default SubscriptionGracePeriodRepository;

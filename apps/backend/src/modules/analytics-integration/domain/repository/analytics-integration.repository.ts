import { singleton } from 'tsyringe';
import { and, desc, eq, sql } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import analyticsIntegration, {
	type TAnalyticsIntegration,
} from '../entities/analytics-integration.entity';

@singleton()
class AnalyticsIntegrationRepository extends AbstractRepository<TAnalyticsIntegration> {
	table = analyticsIntegration;

	constructor() {
		super();
	}

	async findAll({
		limit,
		page,
		where,
	}: ISqlQueryFindBy<TAnalyticsIntegration>): Promise<TAnalyticsIntegration[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();
		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);
		return query.execute();
	}

	async findOneById(id: string): Promise<TAnalyticsIntegration | undefined> {
		return this.db.query.analyticsIntegration.findFirst({
			where: eq(this.table.id, id),
		});
	}

	async findAllByUserId(userId: string): Promise<TAnalyticsIntegration[]> {
		return this.db
			.select()
			.from(this.table)
			.where(eq(this.table.createdBy, userId))
			.orderBy(desc(this.table.createdAt))
			.execute();
	}

	async findEnabledByUserId(userId: string): Promise<TAnalyticsIntegration[]> {
		return this.db
			.select()
			.from(this.table)
			.where(and(eq(this.table.createdBy, userId), eq(this.table.isEnabled, true)))
			.execute();
	}

	async findOneByUserId(userId: string): Promise<TAnalyticsIntegration | undefined> {
		return this.db.query.analyticsIntegration.findFirst({
			where: eq(this.table.createdBy, userId),
		});
	}

	async create(item: Omit<TAnalyticsIntegration, 'createdAt' | 'updatedAt'>): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				...item,
				createdAt: new Date(),
			})
			.execute();
		await this.clearCache();
	}

	async update(
		item: TAnalyticsIntegration,
		updates: Partial<TAnalyticsIntegration>,
	): Promise<void> {
		await this.db
			.update(this.table)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(this.table.id, item.id))
			.execute();
	}

	async disableAllByUserId(userId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({ isEnabled: false, updatedAt: new Date() })
			.where(eq(this.table.createdBy, userId))
			.execute();
	}

	async enableAllByUserId(userId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({ isEnabled: true, updatedAt: new Date() })
			.where(eq(this.table.createdBy, userId))
			.execute();
	}

	async recordFailure(
		integrationId: string,
		errorMessage: string,
		maxFailures: number,
	): Promise<void> {
		await this.db
			.update(this.table)
			.set({
				consecutiveFailures: sql`${this.table.consecutiveFailures} + 1`,
				lastError: errorMessage,
				lastErrorAt: new Date(),
				isEnabled: sql`CASE WHEN ${this.table.consecutiveFailures} + 1 >= ${maxFailures} THEN false ELSE ${this.table.isEnabled} END`,
				updatedAt: new Date(),
			})
			.where(eq(this.table.id, integrationId))
			.execute();
	}

	async delete(item: TAnalyticsIntegration): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, item.id)).execute();
		await this.clearCache();
		return true;
	}
}

export default AnalyticsIntegrationRepository;

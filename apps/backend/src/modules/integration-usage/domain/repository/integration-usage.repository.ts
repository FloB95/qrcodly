import { singleton } from 'tsyringe';
import { desc, eq } from 'drizzle-orm';
import { type TApiClientInfo } from '@shared/schemas';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import integrationUsage, { type TIntegrationUsage } from '../entities/integration-usage.entity';

@singleton()
class IntegrationUsageRepository extends AbstractRepository<TIntegrationUsage> {
	table = integrationUsage;

	constructor() {
		super();
	}

	async findAll({
		limit,
		page,
		where,
	}: ISqlQueryFindBy<TIntegrationUsage>): Promise<TIntegrationUsage[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.lastSeenAt)).$dynamic();

		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);

		return await query.execute();
	}

	async findOneById(id: string): Promise<TIntegrationUsage | undefined> {
		return await this.db.query.integrationUsage.findFirst({
			where: eq(this.table.id, id),
		});
	}

	async findByUserId(userId: string): Promise<TIntegrationUsage[]> {
		return await this.db.query.integrationUsage.findMany({
			where: eq(this.table.userId, userId),
		});
	}

	async create(item: TIntegrationUsage): Promise<void> {
		await this.db.insert(this.table).values(item).execute();
	}

	async update(item: TIntegrationUsage, updates: Partial<TIntegrationUsage>): Promise<void> {
		await this.db.update(this.table).set(updates).where(eq(this.table.id, item.id)).execute();
	}

	async delete(item: TIntegrationUsage): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, item.id)).execute();
		return true;
	}

	async deleteByUserId(userId: string): Promise<void> {
		await this.db.delete(this.table).where(eq(this.table.userId, userId)).execute();
	}

	/** A request without a known version (older client releases) keeps the last version seen. */
	async upsert(userId: string, { client, version }: TApiClientInfo, seenAt: Date): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				id: this.generateId(),
				userId,
				client,
				lastVersion: version,
				firstSeenAt: seenAt,
				lastSeenAt: seenAt,
			})
			.onDuplicateKeyUpdate({
				set: { lastSeenAt: seenAt, ...(version ? { lastVersion: version } : {}) },
			})
			.execute();
	}
}

export default IntegrationUsageRepository;

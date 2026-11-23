import { singleton } from 'tsyringe';
import { asc, eq } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import scanIpExclusion, { type TScanIpExclusion } from '../entities/scan-ip-exclusion.entity';

@singleton()
class ScanIpExclusionRepository extends AbstractRepository<TScanIpExclusion> {
	table = scanIpExclusion;

	constructor() {
		super();
	}

	async findAll({
		limit,
		page,
		where,
	}: ISqlQueryFindBy<TScanIpExclusion>): Promise<TScanIpExclusion[]> {
		const query = this.db.select().from(this.table).orderBy(asc(this.table.createdAt)).$dynamic();
		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);
		return query.execute();
	}

	async findOneById(id: string): Promise<TScanIpExclusion | undefined> {
		return this.db.query.scanIpExclusion.findFirst({
			where: eq(this.table.id, id),
		});
	}

	/** Oldest first; the id breaks ties between entries created in the same second */
	async findAllByUserId(userId: string): Promise<TScanIpExclusion[]> {
		return this.db
			.select()
			.from(this.table)
			.where(eq(this.table.createdBy, userId))
			.orderBy(asc(this.table.createdAt), asc(this.table.id))
			.execute();
	}

	async create(item: Omit<TScanIpExclusion, 'createdAt' | 'updatedAt'>): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				...item,
				createdAt: new Date(),
			})
			.execute();
		await this.clearCache();
	}

	async update(item: TScanIpExclusion, updates: Partial<TScanIpExclusion>): Promise<void> {
		await this.db
			.update(this.table)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(this.table.id, item.id))
			.execute();
	}

	async delete(item: TScanIpExclusion): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, item.id)).execute();
		await this.clearCache();
		return true;
	}

	async deleteAllByUserId(userId: string): Promise<void> {
		await this.db.delete(this.table).where(eq(this.table.createdBy, userId)).execute();
		await this.clearCache();
	}
}

export default ScanIpExclusionRepository;

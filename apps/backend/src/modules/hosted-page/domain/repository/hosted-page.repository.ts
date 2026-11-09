import { singleton } from 'tsyringe';
import { and, desc, eq, isNotNull, isNull, lt, ne } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import { shortUrl } from '@/core/db/schemas';
import { type THostedPageBody } from '@shared/schemas';
import hostedPage, { type THostedPage } from '../entities/hosted-page.entity';

export const toHostedPageBody = (page: THostedPage): THostedPageBody => ({
	type: page.type,
	data: page.data,
});

/** Hosted pages; their address and state live on the short URL pointing at them. */
@singleton()
class HostedPageRepository extends AbstractRepository<THostedPage> {
	table = hostedPage;

	constructor() {
		super();
	}

	async findAll({ limit, page, where }: ISqlQueryFindBy<THostedPage>): Promise<THostedPage[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();
		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);
		return query.execute();
	}

	/** Any page, deleted or not; most callers want {@link findLiveById}. */
	async findOneById(id: string): Promise<THostedPage | undefined> {
		return this.db.query.hostedPage.findFirst({ where: eq(this.table.id, id) });
	}

	async create(page: THostedPage): Promise<void> {
		await this.db.insert(this.table).values(page).execute();
	}

	async update(page: THostedPage, updates: Partial<THostedPage>): Promise<void> {
		await this.db
			.update(this.table)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(this.table.id, page.id))
			.execute();
	}

	/** Removes the row for good; pages are soft deleted first and purged after the retention period. */
	async delete(page: THostedPage): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, page.id)).execute();
		return true;
	}

	async softDelete(page: THostedPage): Promise<void> {
		await this.db
			.update(this.table)
			.set({ deletedAt: new Date() })
			.where(eq(this.table.id, page.id))
			.execute();
	}

	/** A page that has not been deleted. */
	async findLiveById(id: string): Promise<THostedPage | undefined> {
		return this.db.query.hostedPage.findFirst({
			where: and(eq(this.table.id, id), isNull(this.table.deletedAt)),
		});
	}

	/**
	 * A live page, locked until the transaction ends: concurrent saves of the same page run one
	 * after the other, each against what the previous one wrote. Only inside a transaction.
	 */
	async findLiveByIdForUpdate(id: string): Promise<THostedPage | undefined> {
		const [row] = await this.db
			.select()
			.from(this.table)
			.where(and(eq(this.table.id, id), isNull(this.table.deletedAt)))
			.limit(1)
			.for('update')
			.execute();
		return row;
	}

	/** The live page a QR code shows and the short URL it is served under. */
	async findLiveByQrCodeId(
		qrCodeId: string,
	): Promise<{ page: THostedPage; shortCode: string; shortUrlId: string } | undefined> {
		const [row] = await this.db
			.select({ page: this.table, shortCode: shortUrl.shortCode, shortUrlId: shortUrl.id })
			.from(shortUrl)
			.innerJoin(this.table, eq(shortUrl.hostedPageId, this.table.id))
			.where(and(eq(shortUrl.qrCodeId, qrCodeId), isNull(this.table.deletedAt)))
			.limit(1)
			.execute();
		return row;
	}

	/** Every live page of a user; optionally leaving one page out. */
	async findLiveByUser(userId: string, excludePageId?: string): Promise<THostedPage[]> {
		return this.db
			.select()
			.from(this.table)
			.where(
				and(
					eq(this.table.createdBy, userId),
					isNull(this.table.deletedAt),
					excludePageId ? ne(this.table.id, excludePageId) : undefined,
				),
			)
			.execute();
	}

	async findDeletedBefore(cutoff: Date, limit: number): Promise<THostedPage[]> {
		return this.db
			.select()
			.from(this.table)
			.where(and(isNotNull(this.table.deletedAt), lt(this.table.deletedAt, cutoff)))
			.orderBy(this.table.deletedAt)
			.limit(limit)
			.execute();
	}
}

export default HostedPageRepository;

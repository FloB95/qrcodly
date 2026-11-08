import { singleton } from 'tsyringe';
import { and, eq, isNotNull, isNull, lt, ne } from 'drizzle-orm';
import { TransactionContext } from '@/core/db/transaction-context';
import { shortUrl } from '@/core/db/schemas';
import { type THostedPageBody } from '@shared/schemas';
import hostedPage, { type THostedPage } from '../entities/hosted-page.entity';

export const toHostedPageBody = (page: THostedPage): THostedPageBody => ({
	type: page.type,
	data: page.data,
});

/** Hosted pages; their address and state live on the short URL pointing at them. */
@singleton()
class HostedPageRepository {
	private get db() {
		return TransactionContext.db;
	}

	async create(page: Omit<THostedPage, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<void> {
		await this.db
			.insert(hostedPage)
			.values({ ...page, createdAt: new Date() })
			.execute();
	}

	/** A page that has not been deleted. */
	async findLiveById(id: string): Promise<THostedPage | undefined> {
		const [row] = await this.db
			.select()
			.from(hostedPage)
			.where(and(eq(hostedPage.id, id), isNull(hostedPage.deletedAt)))
			.limit(1)
			.execute();
		return row;
	}

	/**
	 * A live page, locked until the transaction ends: concurrent saves of the same page run one
	 * after the other, each against what the previous one wrote. Only inside a transaction.
	 */
	async findLiveByIdForUpdate(id: string): Promise<THostedPage | undefined> {
		const [row] = await this.db
			.select()
			.from(hostedPage)
			.where(and(eq(hostedPage.id, id), isNull(hostedPage.deletedAt)))
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
			.select({ page: hostedPage, shortCode: shortUrl.shortCode, shortUrlId: shortUrl.id })
			.from(shortUrl)
			.innerJoin(hostedPage, eq(shortUrl.hostedPageId, hostedPage.id))
			.where(and(eq(shortUrl.qrCodeId, qrCodeId), isNull(hostedPage.deletedAt)))
			.limit(1)
			.execute();
		return row;
	}

	async updateData(id: string, data: THostedPageBody['data']): Promise<void> {
		await this.db
			.update(hostedPage)
			.set({ data, updatedAt: new Date() })
			.where(eq(hostedPage.id, id))
			.execute();
	}

	async softDelete(id: string): Promise<void> {
		await this.db
			.update(hostedPage)
			.set({ deletedAt: new Date() })
			.where(eq(hostedPage.id, id))
			.execute();
	}

	/** Every live page of a user, for the plan limits; optionally leaving one page out. */
	async findBodiesByUser(userId: string, excludePageId?: string): Promise<THostedPageBody[]> {
		const rows = await this.db
			.select({ type: hostedPage.type, data: hostedPage.data })
			.from(hostedPage)
			.where(
				and(
					eq(hostedPage.createdBy, userId),
					isNull(hostedPage.deletedAt),
					excludePageId ? ne(hostedPage.id, excludePageId) : undefined,
				),
			)
			.execute();
		return rows;
	}

	async findDeletedBefore(cutoff: Date, limit: number): Promise<THostedPage[]> {
		return this.db
			.select()
			.from(hostedPage)
			.where(and(isNotNull(hostedPage.deletedAt), lt(hostedPage.deletedAt, cutoff)))
			.orderBy(hostedPage.deletedAt)
			.limit(limit)
			.execute();
	}

	async hardDelete(id: string): Promise<void> {
		await this.db.delete(hostedPage).where(eq(hostedPage.id, id)).execute();
	}
}

export default HostedPageRepository;

import { singleton } from 'tsyringe';
import { count, desc, eq, inArray } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import { withDeadlockRetry } from '@/core/db/with-deadlock-retry';
import tag, { type TTag } from '../entities/tag.entity';
import qrCodeTag from '../entities/qr-code-tag.entity';
import shortUrlTag from '@/modules/url-shortener/domain/entities/short-url-tag.entity';

@singleton()
class TagRepository extends AbstractRepository<TTag> {
	table = tag;

	constructor() {
		super();
	}

	async findAll({ limit, page, where }: ISqlQueryFindBy<TTag>): Promise<TTag[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();

		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);

		return await query.execute();
	}

	async findOneById(id: string): Promise<TTag | undefined> {
		return await this.db.query.tag.findFirst({
			where: eq(this.table.id, id),
		});
	}

	async create(newTag: Omit<TTag, 'createdAt' | 'updatedAt'>): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				id: newTag.id,
				name: newTag.name,
				color: newTag.color,
				createdBy: newTag.createdBy,
				createdAt: new Date(),
			})
			.execute();

		await this.clearCache();
	}

	async update(existingTag: TTag, updates: Partial<TTag>): Promise<void> {
		await this.db.update(this.table).set(updates).where(eq(this.table.id, existingTag.id));
		await this.clearCache();
	}

	async delete(existingTag: TTag): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, existingTag.id)).execute();
		await this.clearCache();
		return true;
	}

	async findTagsByQrCodeId(qrCodeId: string): Promise<TTag[]> {
		const rows = await this.db
			.select({ tag: this.table })
			.from(this.table)
			.innerJoin(qrCodeTag, eq(this.table.id, qrCodeTag.tagId))
			.where(eq(qrCodeTag.qrCodeId, qrCodeId))
			.orderBy(desc(this.table.createdAt))
			.execute();

		return rows.map((row) => row.tag);
	}

	async setQrCodeTags(qrCodeId: string, tagIds: string[]): Promise<void> {
		await withDeadlockRetry(() =>
			this.db.transaction(async (tx) => {
				await tx.delete(qrCodeTag).where(eq(qrCodeTag.qrCodeId, qrCodeId)).execute();

				if (tagIds.length > 0) {
					await tx
						.insert(qrCodeTag)
						.values(tagIds.map((tagId) => ({ qrCodeId, tagId })))
						.execute();
				}
			}),
		);
	}

	async findTagsByShortUrlId(shortUrlId: string): Promise<TTag[]> {
		const rows = await this.db
			.select({ tag: this.table })
			.from(this.table)
			.innerJoin(shortUrlTag, eq(this.table.id, shortUrlTag.tagId))
			.where(eq(shortUrlTag.shortUrlId, shortUrlId))
			.orderBy(desc(this.table.createdAt))
			.execute();

		return rows.map((row) => row.tag);
	}

	async findTagsByShortUrlIds(shortUrlIds: string[]): Promise<Map<string, TTag[]>> {
		if (shortUrlIds.length === 0) return new Map();

		const rows = await this.db
			.select({ shortUrlId: shortUrlTag.shortUrlId, tag: this.table })
			.from(this.table)
			.innerJoin(shortUrlTag, eq(this.table.id, shortUrlTag.tagId))
			.where(inArray(shortUrlTag.shortUrlId, shortUrlIds))
			.orderBy(desc(this.table.createdAt))
			.execute();

		const map = new Map<string, TTag[]>();
		for (const row of rows) {
			const existing = map.get(row.shortUrlId) ?? [];
			existing.push(row.tag);
			map.set(row.shortUrlId, existing);
		}
		return map;
	}

	async setShortUrlTags(shortUrlId: string, tagIds: string[]): Promise<void> {
		await withDeadlockRetry(() =>
			this.db.transaction(async (tx) => {
				await tx.delete(shortUrlTag).where(eq(shortUrlTag.shortUrlId, shortUrlId)).execute();

				if (tagIds.length > 0) {
					await tx
						.insert(shortUrlTag)
						.values(tagIds.map((tagId) => ({ shortUrlId, tagId })))
						.execute();
				}
			}),
		);
	}

	async getQrCodeCountsByTagId(userId: string): Promise<Map<string, number>> {
		const rows = await this.db
			.select({
				tagId: qrCodeTag.tagId,
				count: count(qrCodeTag.qrCodeId),
			})
			.from(qrCodeTag)
			.innerJoin(this.table, eq(qrCodeTag.tagId, this.table.id))
			.where(eq(this.table.createdBy, userId))
			.groupBy(qrCodeTag.tagId)
			.execute();

		const map = new Map<string, number>();
		for (const row of rows) {
			map.set(row.tagId, row.count);
		}
		return map;
	}
}

export default TagRepository;

import { singleton } from 'tsyringe';
import { count, desc, eq } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import tag, { type TTag } from '../entities/tag.entity';
import qrCodeTag from '../entities/qr-code-tag.entity';

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
		await this.db.transaction(async (tx) => {
			await tx.delete(qrCodeTag).where(eq(qrCodeTag.qrCodeId, qrCodeId)).execute();

			if (tagIds.length > 0) {
				await tx
					.insert(qrCodeTag)
					.values(tagIds.map((tagId) => ({ qrCodeId, tagId })))
					.execute();
			}
		});
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

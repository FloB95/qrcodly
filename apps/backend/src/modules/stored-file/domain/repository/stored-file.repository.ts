import { singleton } from 'tsyringe';
import {
	and,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNotNull,
	isNull,
	lt,
	or,
	sql,
	type SQL,
} from 'drizzle-orm';
import { hostedPage } from '@qrcodly/db';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import storedFile, {
	type TStoredFile,
	type TStoredFileOwnerType,
} from '../entities/stored-file.entity';

export type TStoredFileOwner = { type: TStoredFileOwnerType; id: string };
export type TStoredFileRole = { slot: string; itemId?: string };

/** The table behind each owner type, for finding files whose owner no longer exists. */
const OWNER_TABLES = { hosted_page: hostedPage } as const satisfies Record<
	TStoredFileOwnerType,
	{ id: unknown }
>;

@singleton()
class StoredFileRepository extends AbstractRepository<TStoredFile> {
	table = storedFile;

	constructor() {
		super();
	}

	async findAll({ limit, page, where }: ISqlQueryFindBy<TStoredFile>): Promise<TStoredFile[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();
		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);
		return query.execute();
	}

	async findOneById(id: string): Promise<TStoredFile | undefined> {
		return this.db.query.storedFile.findFirst({ where: eq(this.table.id, id) });
	}

	async findByFileKey(fileKey: string): Promise<TStoredFile | undefined> {
		return this.db.query.storedFile.findFirst({ where: eq(this.table.fileKey, fileKey) });
	}

	async findByFileKeys(fileKeys: string[]): Promise<TStoredFile[]> {
		if (fileKeys.length === 0) return [];
		return this.db.select().from(this.table).where(inArray(this.table.fileKey, fileKeys)).execute();
	}

	async findByOwner(owner: TStoredFileOwner): Promise<TStoredFile[]> {
		return this.db
			.select()
			.from(this.table)
			.where(and(eq(this.table.ownerType, owner.type), eq(this.table.ownerId, owner.id)))
			.execute();
	}

	async create(file: TStoredFile): Promise<void> {
		await this.db.insert(this.table).values(file).execute();
	}

	async update(file: TStoredFile, updates: Partial<TStoredFile>): Promise<void> {
		await this.db.update(this.table).set(updates).where(eq(this.table.id, file.id)).execute();
	}

	async delete(file: TStoredFile): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, file.id)).execute();
		return true;
	}

	async deleteByFileKey(fileKey: string): Promise<void> {
		await this.db.delete(this.table).where(eq(this.table.fileKey, fileKey)).execute();
	}

	async countUnclaimedSince(userId: string, since: Date): Promise<number> {
		const [row] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(this.table)
			.where(
				and(
					eq(this.table.userId, userId),
					isNull(this.table.claimedAt),
					gte(this.table.createdAt, since),
				),
			)
			.execute();
		return Number(row?.count ?? 0);
	}

	/**
	 * Binds a file to its owner and role; a file taken back into use is no longer released.
	 * Atomic: a file already owned by someone else is left alone and `false` is returned.
	 */
	async claim(fileKey: string, owner: TStoredFileOwner, role: TStoredFileRole): Promise<boolean> {
		const t = this.table;
		const [result] = await this.db
			.update(t)
			.set({
				ownerType: owner.type,
				ownerId: owner.id,
				slot: role.slot,
				itemId: role.itemId ?? null,
				claimedAt: new Date(),
				releasedAt: null,
				purgeAfter: null,
			})
			.where(
				and(
					eq(t.fileKey, fileKey),
					or(isNull(t.ownerId), and(eq(t.ownerType, owner.type), eq(t.ownerId, owner.id))),
				),
			)
			.execute();
		return result.affectedRows > 0;
	}

	/** Marks a file as no longer used by its owner; `purgeAfter` null keeps it for good. */
	async release(fileKey: string, purgeAfter: Date | null, now: Date = new Date()): Promise<void> {
		await this.db
			.update(this.table)
			.set({ releasedAt: now, purgeAfter })
			.where(eq(this.table.fileKey, fileKey))
			.execute();
	}

	/** Brings the purge date of a user's released files forward, keeping only the newest `keep`. */
	async purgeOldestRetained(userId: string, keep: number, now: Date = new Date()): Promise<void> {
		const t = this.table;
		const surplus = await this.db
			.select({ id: t.id })
			.from(t)
			.where(and(eq(t.userId, userId), isNotNull(t.releasedAt), gt(t.purgeAfter, now)))
			.orderBy(desc(t.releasedAt))
			.limit(1000)
			.offset(keep)
			.execute();
		if (surplus.length === 0) return;
		// re-checked in the update: a file claimed again since the select keeps no purge date
		await this.db
			.update(t)
			.set({ purgeAfter: now })
			.where(
				and(
					inArray(
						t.id,
						surplus.map((row) => row.id),
					),
					isNotNull(t.releasedAt),
					gt(t.purgeAfter, now),
				),
			)
			.execute();
	}

	/** Uploads nobody claimed within the grace period (the editor was abandoned). */
	unclaimedBefore(cutoff: Date): SQL {
		const t = this.table;
		return and(isNull(t.claimedAt), lt(t.createdAt, cutoff)) as SQL;
	}

	/** Released files whose retention period is over; a file taken back into use is not released. */
	purgeDue(now: Date): SQL {
		const t = this.table;
		return and(isNotNull(t.releasedAt), isNotNull(t.purgeAfter), lt(t.purgeAfter, now)) as SQL;
	}

	/**
	 * Files still in use by an owner that no longer exists, e.g. after a failed cleanup. Released
	 * files are left to their purge date: their owner is gone on purpose.
	 */
	orphanedClaimed(ownerType: TStoredFileOwnerType, cutoff: Date): SQL {
		const t = this.table;
		const owners = OWNER_TABLES[ownerType];
		return and(
			eq(t.ownerType, ownerType),
			isNotNull(t.claimedAt),
			isNull(t.releasedAt),
			lt(t.claimedAt, cutoff),
			sql`NOT EXISTS (SELECT 1 FROM ${owners} WHERE ${owners.id} = ${t.ownerId})`,
		) as SQL;
	}

	async findUnclaimedBefore(cutoff: Date, limit: number): Promise<TStoredFile[]> {
		return this.findBatch(this.unclaimedBefore(cutoff), this.table.createdAt, limit);
	}

	async findPurgeDue(now: Date, limit: number): Promise<TStoredFile[]> {
		return this.findBatch(this.purgeDue(now), this.table.purgeAfter, limit);
	}

	async findOrphanedClaimed(
		ownerType: TStoredFileOwnerType,
		cutoff: Date,
		limit: number,
	): Promise<TStoredFile[]> {
		return this.findBatch(this.orphanedClaimed(ownerType, cutoff), this.table.claimedAt, limit);
	}

	/**
	 * The file, locked until the transaction ends, if it still matches `condition`. A cleanup
	 * re-checks its reason here, so a file claimed or taken back into use since it was selected is
	 * left alone. Only inside a transaction.
	 */
	async lockIfStill(fileKey: string, condition: SQL): Promise<TStoredFile | undefined> {
		// by file key, the index `claim` and `release` lock first: the same lock order, no deadlock
		const [row] = await this.db
			.select()
			.from(this.table)
			.where(and(eq(this.table.fileKey, fileKey), condition))
			.limit(1)
			.for('update')
			.execute();
		return row;
	}

	private async findBatch(
		condition: SQL,
		orderColumn: (typeof storedFile)['createdAt' | 'purgeAfter' | 'claimedAt'],
		limit: number,
	): Promise<TStoredFile[]> {
		return this.db
			.select()
			.from(this.table)
			.where(condition)
			.orderBy(orderColumn)
			.limit(limit)
			.execute();
	}
}

export default StoredFileRepository;

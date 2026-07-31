import { singleton } from 'tsyringe';
import { eq } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import userSafetyStanding, {
	type TUserSafetyStanding,
} from '../entities/user-safety-standing.entity';

/**
 * Standing of the warn→ban ladder, keyed by Clerk user id.
 *
 * Deliberately persisted rather than counted in Redis: the previous implementation kept strikes in
 * the cache only, so a flush wiped every user's history.
 */
@singleton()
export class UserSafetyStandingRepository extends AbstractRepository<TUserSafetyStanding> {
	table = userSafetyStanding;

	async findAll({
		limit,
		page,
	}: ISqlQueryFindBy<TUserSafetyStanding>): Promise<TUserSafetyStanding[]> {
		const query = this.db.select().from(this.table).$dynamic();
		void this.withPagination(query, page, limit);
		return query.execute();
	}

	/** The primary key is the user id, so `findOneById` and `findOneByUserId` are the same lookup. */
	async findOneById(userId: string): Promise<TUserSafetyStanding | undefined> {
		const [row] = await this.db
			.select()
			.from(this.table)
			.where(eq(this.table.userId, userId))
			.limit(1)
			.execute();
		return row;
	}

	async create(item: TUserSafetyStanding): Promise<void> {
		await this.db.insert(this.table).values(item).execute();
		await this.clearCache();
	}

	async update(item: TUserSafetyStanding, updates: Partial<TUserSafetyStanding>): Promise<void> {
		await this.db
			.update(this.table)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(this.table.userId, item.userId))
			.execute();
	}

	async delete(item: TUserSafetyStanding): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.userId, item.userId)).execute();
		await this.clearCache();
		return true;
	}

	/** Fetches the row, creating a blank one on first offence. */
	async findOrCreate(userId: string): Promise<TUserSafetyStanding> {
		const existing = await this.findOneById(userId);
		if (existing) return existing;

		const row: TUserSafetyStanding = {
			userId,
			offenceCount: 0,
			firstOffenceAt: null,
			lastOffenceAt: null,
			warnedAt: null,
			warningEmailSentAt: null,
			bannedAt: null,
			createdAt: new Date(),
			updatedAt: null,
		};

		try {
			await this.create(row);
		} catch {
			// concurrent first offence for the same user — whoever lost the race re-reads the winner
			const raced = await this.findOneById(userId);
			if (raced) return raced;
			throw new Error(`Failed to create safety standing for ${userId}`);
		}

		return row;
	}

	async markWarningEmailSent(userId: string, sentAt: Date = new Date()): Promise<void> {
		await this.db
			.update(this.table)
			.set({ warningEmailSentAt: sentAt, updatedAt: new Date() })
			.where(eq(this.table.userId, userId))
			.execute();
	}

	/** Clears the ladder for a user — used by the admin CLI after a manual review or unban. */
	async reset(userId: string): Promise<void> {
		await this.db
			.update(this.table)
			.set({
				offenceCount: 0,
				firstOffenceAt: null,
				lastOffenceAt: null,
				warnedAt: null,
				warningEmailSentAt: null,
				bannedAt: null,
				updatedAt: new Date(),
			})
			.where(eq(this.table.userId, userId))
			.execute();
	}
}

export default UserSafetyStandingRepository;

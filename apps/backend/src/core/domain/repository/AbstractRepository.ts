import { eq, SQL, sql } from 'drizzle-orm';
import {
	type MySqlSelect,
	getTableConfig,
	type MySqlTableWithColumns,
	type MySqlSelectDynamic,
} from 'drizzle-orm/mysql-core';
import { v4 as uuidv4 } from 'uuid';
import db from '@/core/db';
import { type ISqlQueryFindBy, type WhereConditions } from '@/core/interface/IRepository';
import { convertWhereConditionToDrizzle } from '@/core/db/utils';
import { DEFAULT_PAGE_SIZE } from '@/core/config/constants';
import { container } from 'tsyringe';
import { KeyCache } from '@/core/cache';

/**
 * Abstract class for repositories.
 */
export default abstract class AbstractRepository<T> {
	protected appCache: KeyCache;

	constructor() {
		this.appCache = container.resolve(KeyCache);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	abstract table: MySqlTableWithColumns<any>;
	abstract findAll({ limit, offset, where }: ISqlQueryFindBy<T>): Promise<T[]>;
	abstract findOneById(id: string): Promise<T | undefined>;
	abstract create(item: T): Promise<void>;
	abstract update(item: T, updates: Partial<T>): Promise<void>;
	abstract delete(item: T): Promise<boolean>;

	/**
	 * Counts the total number of items in the table.
	 * @returns A promise that resolves to the total count.
	 */
	async countTotal(whereConditions?: WhereConditions<T> | SQL<T>): Promise<number> {
		const cacheCount = (await this.appCache.get(this.getTotalCacheKey())) as string;

		if (!cacheCount || whereConditions) {
			let query = db
				.select({
					count: sql<number>`count(${this.table.id})`,
				})
				.from(this.table)
				.$dynamic();

			if (whereConditions) {
				query = this.withWhere(query, whereConditions);
			}

			const result = await query.execute();
			const count = result[0]?.count || 0;

			if (!whereConditions) {
				await this.appCache.set(this.getTotalCacheKey(), count);
			}
			return count;
		}

		return parseInt(cacheCount);
	}

	async clearCache(): Promise<void> {
		try {
			await this.appCache.del(this.getTotalCacheKey());
		} catch {
			// intentionally left blank
		}
	}

	getTotalCacheKey(): string {
		const { name } = getTableConfig(this.table);
		return `${name}_table_count_total`;
	}

	/**
	 * Generates a new UUIDv4 ID.
	 * @returns a promise that resolves to the generated ID.
	 */
	async generateId(): Promise<string> {
		let newId: string;

		while (true) {
			newId = uuidv4();

			const existing = await db.select().from(this.table).where(eq(this.table.id, newId)).execute();

			if (existing.length === 0) {
				break;
			}
		}

		return newId;
	}

	withPagination<T extends MySqlSelect>(
		qb: T,
		page: number,
		pageSize: number = DEFAULT_PAGE_SIZE,
	): MySqlSelectDynamic<T> {
		return qb
			.limit(pageSize)
			.offset(page * pageSize)
			.$dynamic();
	}

	withWhere<T extends MySqlSelect>(
		qb: T,
		where: WhereConditions<unknown> | SQL,
	): MySqlSelectDynamic<T> {
		const whereDrizzle =
			where instanceof SQL ? where : convertWhereConditionToDrizzle<T>(where, this.table);
		return qb.where(whereDrizzle).$dynamic();
	}
}

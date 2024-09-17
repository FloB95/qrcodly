import { eq, sql } from "drizzle-orm";
import {
  type MySqlSelect,
  getTableConfig,
  type MySqlTableWithColumns,
  type MySqlSelectDynamic,
} from "drizzle-orm/mysql-core";
import { v4 as uuidv4 } from "uuid";
import {
  type ISqlQueryFindBy,
  type IBaseSqlRepository,
  type WhereConditions,
} from "~/server/application/repositories/IBaseSqlRepository";
import { db } from "~/server/infrastructure/db/drizzle";
import { convertWhereConditionToDrizzle } from "~/server/infrastructure/db/drizzle/utils";

/**
 * Abstract base repository providing common SQL operations for a given table type.
 */
export abstract class BaseRepository<T> implements IBaseSqlRepository<T> {
  /**
   * Represents the database table and its columns.
   */
  abstract table: MySqlTableWithColumns<any>;

  /**
   * Finds all entries in the database that match the given query conditions.
   * @param limit - Maximum number of results to return.
   * @param offset - Offset of the first result to return.
   * @param where - Filtering conditions.
   * @returns A promise that resolves to an array of matching entries.
   */
  abstract findAll({ limit, offset, where }: ISqlQueryFindBy<T>): Promise<T[]>;

  /**
   * Finds a single entry by its ID.
   * @param id - The ID of the entry to find.
   * @returns A promise that resolves to the entry if found, otherwise undefined.
   */
  abstract findOneById(id: string): Promise<T | undefined>;

  /**
   * Creates a new entry in the database.
   * @param item - The entry to create.
   * @returns A promise that resolves once the operation completes.
   */
  abstract create(item: T): Promise<void>;

  /**
   * Updates an existing entry in the database.
   * @param item - The entry to update.
   * @param updates - The changes to apply to the entry.
   * @returns A promise that resolves once the operation completes.
   */
  abstract update(item: T, updates: Partial<T>): Promise<void>;

  /**
   * Deletes an entry from the database.
   * @param item - The entry to delete.
   * @returns A promise that resolves to true if the operation was successful, otherwise false.
   */
  abstract delete(item: T): Promise<boolean>;

  /**
   * Counts the total number of items in the table.
   * @returns A promise that resolves to the total count.
   */
  public async countTotal(): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`count(${this.table.id})`,
      })
      .from(this.table);

    const count = result[0]?.count ?? 0;
    return count;
  }

  /**
   * Returns the cache key for storing the total count of the table's entries.
   * @returns The cache key as a string.
   */
  public getTotalCacheKey(): string {
    const { name } = getTableConfig(this.table);
    return `${name}_table_count_total`;
  }

  /**
   * Generates a new UUIDv4 ID, ensuring it does not already exist in the table.
   * @returns A promise that resolves to the generated ID.
   */
  public async generateId(): Promise<string> {
    let newId: string;

    while (true) {
      newId = uuidv4();

      const existing = await db
        .select()
        .from(this.table)
        .where(eq(this.table.id, newId))
        .execute();

      if (existing.length === 0) {
        break;
      }
    }

    return newId;
  }

  /**
   * Applies pagination to the provided query builder.
   * @param qb - The query builder to apply pagination to.
   * @param page - The page number.
   * @param pageSize - The number of items per page, defaults to 10.
   * @returns A dynamic query builder with pagination applied.
   */
  public withPagination<T extends MySqlSelect>(
    qb: T,
    page: number,
    pageSize = 10,
  ): MySqlSelectDynamic<T> {
    return qb
      .limit(pageSize)
      .offset(page * pageSize)
      .$dynamic();
  }

  /**
   * Applies where conditions to the provided query builder.
   * @param qb - The query builder to apply conditions to.
   * @param where - The conditions to apply.
   * @returns A dynamic query builder with conditions applied.
   */
  public withWhere<T extends MySqlSelect>(
    qb: T,
    where: WhereConditions<T>,
  ): MySqlSelectDynamic<T> {
    const whereDrizzle = where
      ? convertWhereConditionToDrizzle<T>(where, this.table)
      : undefined;
    return qb.where(whereDrizzle).$dynamic();
  }
}

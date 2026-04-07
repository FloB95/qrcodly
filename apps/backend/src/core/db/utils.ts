import { type MySqlTableWithColumns } from 'drizzle-orm/mysql-core';
import { type WhereConditions, type WhereField } from '../interface/repository.interface';
import { and, eq, gt, gte, isNotNull, isNull, like, lt, lte, not, or, type SQL } from 'drizzle-orm';

// Re-exported from @qrcodly/db for backwards compatibility with existing imports.
export { createTable } from '@qrcodly/db';

/**
 * Converts a where condition object to a Drizzle SQL object.
 * @param where The where condition object.
 * @param table The table schema.
 * @param mode The combination mode: 'and' (default) combines conditions with AND, 'or' combines with OR.
 * @returns The Drizzle SQL object representing the where condition.
 */
export function convertWhereConditionToDrizzle<T>(
	where: WhereConditions<T>,
	table: MySqlTableWithColumns<any>,
	mode: 'and' | 'or' = 'and',
): SQL | undefined {
	const combine = mode === 'or' ? or : and;
	let sql: SQL<unknown> | undefined;

	for (const [key, value] of Object.entries(where)) {
		if (typeof value === 'object' && value !== null) {
			// If the value is an object, it means it contains comparison operators
			const whereField = value as WhereField;

			if (whereField.eq !== undefined) {
				if (whereField.eq === null) {
					sql = sql ? combine(sql, isNull(table[key])) : isNull(table[key]);
				} else {
					sql = sql ? combine(sql, eq(table[key], whereField.eq)) : eq(table[key], whereField.eq);
				}
			}
			if (whereField.neq !== undefined) {
				if (whereField.neq === null) {
					sql = sql ? combine(sql, isNotNull(table[key])) : isNotNull(table[key]);
				} else {
					sql = sql
						? combine(sql, not(eq(table[key], whereField.neq)))
						: not(eq(table[key], whereField.neq));
				}
			}
			if (whereField.like !== undefined) {
				sql = sql
					? combine(sql, like(table[key] as unknown as SQL, `%${whereField.like}%`))
					: like(table[key] as unknown as SQL, `%${whereField.like}%`);
			}
			if (whereField.gt !== undefined) {
				sql = sql ? combine(sql, gt(table[key], whereField.gt)) : gt(table[key], whereField.gt);
			}
			if (whereField.gte !== undefined) {
				sql = sql ? combine(sql, gte(table[key], whereField.gte)) : gte(table[key], whereField.gte);
			}
			if (whereField.lt !== undefined) {
				sql = sql ? combine(sql, lt(table[key], whereField.lt)) : lt(table[key], whereField.lt);
			}
			if (whereField.lte !== undefined) {
				sql = sql ? combine(sql, lte(table[key], whereField.lte)) : lte(table[key], whereField.lte);
			}
		} else {
			// If the value is not an object, it means it's a direct comparison value
			sql = sql ? combine(sql, eq(table[key], value)) : eq(table[key], value);
		}
	}

	return sql;
}

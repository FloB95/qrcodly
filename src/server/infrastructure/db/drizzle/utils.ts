/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { and, eq, gt, gte, like, lt, lte, not, type SQL } from "drizzle-orm";
import {
  type MySqlColumn,
  type MySqlTableWithColumns,
} from "drizzle-orm/mysql-core";
import {
  type WhereField,
  type WhereConditions,
} from "~/server/application/repositories/IBaseSqlRepository";

/**
 * Converts a where condition object to a Drizzle SQL object.
 * @param where The where condition object.
 * @param table The table schema.
 * @returns The Drizzle SQL object representing the where condition.
 */
export function convertWhereConditionToDrizzle<T>(
  where: WhereConditions<T>,
  table: MySqlTableWithColumns<any>,
): SQL {
  let sql: SQL<any> | undefined;

  for (const [key, value] of Object.entries(where)) {
    if (typeof value === "object" && value !== null) {
      // If the value is an object, it means it contains comparison operators
      const whereField = value as WhereField;

      if (whereField.eq !== undefined) {
        sql = sql
          ? and(sql, eq(table[key], whereField.eq))
          : eq(table[key], whereField.eq);
      }
      if (whereField.neq !== undefined) {
        sql = sql
          ? and(sql, not(eq(table[key], whereField.neq)))
          : not(eq(table[key], whereField.neq));
      }
      if (whereField.like !== undefined) {
        sql = sql
          ? and(sql, like(table[key], `%${whereField.like}%`))
          : like(table[key], `%${whereField.like}%`);
      }
      if (whereField.gt !== undefined) {
        sql = sql
          ? and(sql, gt(table[key], whereField.gt))
          : gt(table[key], whereField.gt);
      }
      if (whereField.gte !== undefined) {
        sql = sql
          ? and(sql, gte(table[key], whereField.gte))
          : gte(table[key], whereField.gte);
      }
      if (whereField.lt !== undefined) {
        sql = sql
          ? and(sql, lt(table[key], whereField.lt))
          : lt(table[key], whereField.lt);
      }
      if (whereField.lte !== undefined) {
        sql = sql
          ? and(sql, lte(table[key], whereField.lte))
          : lte(table[key], whereField.lte);
      }
    } else {
      // If the value is not an object, it means it's a direct comparison value
      sql = sql ? and(eq(table[key], value)) : eq(table[key], value);
    }
  }

  return sql ?? ({} as SQL<unknown>);
}

/**
 * Converts a select object to a Drizzle SQL object.
 * @param select The select object.
 * @param table The table schema.
 * @returns The Drizzle SQL object representing the select object.
 */
export function convertQuerySelectToDrizzle(
  select: Record<string, boolean>,
  table: MySqlTableWithColumns<any>,
) {
  return select
    ? Object.entries(select)
        .filter(([key, value]) => value === true)
        .reduce(
          (acc, [key, value]) => {
            acc[key] = table[key];
            return acc;
          },
          {} as Record<string, any>,
        )
    : undefined;
}

export function convertMySqlColumnsToSelectObj(columns: MySqlColumn[]) {
  return columns.reduce((acc: Record<string, any>, column) => {
    acc[column.name] = column;
    return acc;
  }, {});
}

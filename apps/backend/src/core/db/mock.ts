import * as schemas from './schemas';
import db from '.';
import { getTableName, sql } from 'drizzle-orm';
import { MySqlTable } from 'drizzle-orm/mysql-core';

export const cleanUpMockData = async () => {
	await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
	try {
		for (const schema of Object.values(schemas)) {
			if (schema instanceof MySqlTable) {
				try {
					await db.delete(schema);
				} catch (error) {
					console.warn(`Failed to clean up table ${getTableName(schema)}:`, error);
				}
			}
		}
	} finally {
		await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
	}
};

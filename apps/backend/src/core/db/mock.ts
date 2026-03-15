import * as schemas from './schemas';
import db from '.';
import { getTableName, sql } from 'drizzle-orm';
import { MySqlTable } from 'drizzle-orm/mysql-core';

export const cleanUpMockData = async () => {
	await db.transaction(async (tx) => {
		await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
		try {
			for (const schema of Object.values(schemas)) {
				if (schema instanceof MySqlTable) {
					await tx.delete(schema);
				}
			}
		} finally {
			await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
		}
	});
};

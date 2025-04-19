import * as schemas from './schemas';
import db from '.';
import { MySqlTable } from 'drizzle-orm/mysql-core';

export const cleanUpMockData = async () => {
	// clean up the database
	for (const schema of Object.values(schemas)) {
		if (schema instanceof MySqlTable) await db.delete(schema);
	}
};

import db, { poolConnection } from '.';
import { DB_MIGRATION_FOLDER } from '../config/constants';
import { env } from '../config/env';
import { migrate } from 'drizzle-orm/mysql2/migrator';

export const migrateDb = async () => {
	if (!env.DB_MIGRATING) {
		throw new Error('You must set DB_MIGRATING to "true" when running migrations');
	}

	await migrate(db, { migrationsFolder: DB_MIGRATION_FOLDER });
	await poolConnection.end();
};

// Run the migration
void migrateDb();

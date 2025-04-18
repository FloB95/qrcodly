import { DB_MIGRATION_FOLDER, DB_SCHEMA_FILE } from './src/core/config/constants';
import 'dotenv/config';
import type { Config } from 'drizzle-kit';
import { env } from './src/core/config/env';

export default {
	schema: DB_SCHEMA_FILE,
	out: DB_MIGRATION_FOLDER,
	casing: 'snake_case',
	dialect: 'mysql',
	dbCredentials: {
		host: env.DB_HOST!,
		user: env.DB_USER,
		password: env.DB_PASSWORD,
		database: env.DB_NAME!,
		port: Number(env.DB_PORT),
	},
} satisfies Config;

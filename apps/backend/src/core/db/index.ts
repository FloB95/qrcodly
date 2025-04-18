// import * as schema from '@/db/schema'
import { drizzle } from 'drizzle-orm/mysql2';
import { env } from '../config/env';
import * as schema from './schemas';
import mysql from 'mysql2/promise';
import { DB_LOGGING } from '../config/constants';

export const poolConnection = mysql.createPool({
	host: env.DB_HOST,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.NODE_ENV === 'test' ? env.TEST_DB_NAME : env.DB_NAME,
	port: Number(env.DB_PORT),
	connectionLimit: env.DB_MIGRATING || env.DB_SEEDING ? 1 : undefined,
});

const db = drizzle(poolConnection, {
	schema,
	mode: 'default',
	casing: 'snake_case',
	logger: DB_LOGGING,
});

export default db;

// import * as schema from '@/db/schema'
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { env } from '../config/env';
import * as schema from './schemas';
import mysql from 'mysql2/promise';
import { DB_LOGGING } from '../config/constants';
import { dbQueries, dbQueryDuration, safely } from '../metrics';

const DB_OPERATION_PATTERN = /^\s*\(?\s*(select|insert|update|delete)/i;
const INSTRUMENTED = Symbol('metrics.instrumented');

type Queryable = Record<string, unknown> & {
	query: (...args: unknown[]) => Promise<unknown>;
	execute: (...args: unknown[]) => Promise<unknown>;
};

/**
 * Reduces a statement to one of five labels.
 *
 * Deliberately not the full SQL: query text is unbounded and would create a new time series per
 * distinct statement. Anything unrecognised collapses into `other`.
 */
function operationOf(sql: unknown): string {
	try {
		if (typeof sql === 'string') {
			return DB_OPERATION_PATTERN.exec(sql)?.[1].toLowerCase() ?? 'other';
		}
		if (sql && typeof sql === 'object' && 'sql' in sql) {
			return operationOf(sql.sql);
		}
	} catch {
		// Fall through to 'other' — label derivation must never fail a query.
	}
	return 'other';
}

/**
 * Times every query going through a pool or a pooled connection.
 *
 * Both entry points need wrapping: Drizzle talks to the pool directly for plain queries but
 * checks out a connection for transactions, so instrumenting only the pool would silently omit
 * everything the UnitOfWork does.
 *
 * This sits in front of every single query the app makes, so it is written to be inert on
 * failure: metric emission is guarded, and if the driver ever stops exposing these methods we
 * leave the object untouched rather than replacing them with something broken.
 */
function instrumentQueryable<T extends object>(queryable: T): T {
	const target = queryable as T & Partial<Queryable> & { [INSTRUMENTED]?: boolean };
	if (target[INSTRUMENTED]) return queryable;
	target[INSTRUMENTED] = true;

	for (const method of ['query', 'execute'] as const) {
		const originalMethod = target[method];
		if (typeof originalMethod !== 'function') continue;

		const original = originalMethod.bind(queryable);

		target[method] = async (...args: unknown[]) => {
			const operation = operationOf(args[0]);
			const startedAt = Date.now();
			try {
				const result = await original(...args);
				safely(() => {
					dbQueryDuration.record(Date.now() - startedAt, { operation });
					dbQueries.add(1, { operation, outcome: 'ok' });
				});
				return result;
			} catch (error) {
				safely(() => {
					dbQueryDuration.record(Date.now() - startedAt, { operation });
					dbQueries.add(1, { operation, outcome: 'error' });
				});
				throw error;
			}
		};
	}

	return queryable;
}

export const poolConnection = mysql.createPool({
	host: env.DB_HOST,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.NODE_ENV === 'test' ? env.TEST_DB_NAME : env.DB_NAME,
	port: Number(env.DB_PORT),
	connectionLimit: env.DB_MIGRATING || env.DB_SEEDING ? 1 : 50,
	waitForConnections: true,
	queueLimit: 0,
});

instrumentQueryable(poolConnection);

const originalGetConnection = poolConnection.getConnection.bind(poolConnection);
poolConnection.getConnection = async () => {
	const connection = await originalGetConnection();
	try {
		return instrumentQueryable(connection);
	} catch {
		return connection;
	}
};

const db = drizzle(poolConnection, {
	schema,
	mode: 'default',
	casing: 'snake_case',
	logger: DB_LOGGING,
});

export type AppDatabase = MySql2Database<typeof schema>;

export default db;

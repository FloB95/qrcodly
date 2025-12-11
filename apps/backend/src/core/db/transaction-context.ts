import { AsyncLocalStorage } from 'async_hooks';
import type { AppDatabase } from './index';
import defaultDb from './index';

const als = new AsyncLocalStorage<AppDatabase>();

/**
 * TransactionContext provides access to the current database transaction context.
 * If no transaction is active, it falls back to the default database connection.
 * It uses AsyncLocalStorage to store and retrieve the current transaction.
 */
export const TransactionContext = {
	get db(): AppDatabase {
		return als.getStore() ?? defaultDb;
	},

	run<T>(tx: AppDatabase, callback: () => Promise<T>): Promise<T> {
		return als.run(tx, callback);
	},
};

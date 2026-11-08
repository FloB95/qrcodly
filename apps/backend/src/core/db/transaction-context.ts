import { AsyncLocalStorage } from 'async_hooks';
import type { AppDatabase } from './index';
import defaultDb from './index';

type TTransactionStore = { tx: AppDatabase; open: boolean };

const als = new AsyncLocalStorage<TTransactionStore>();

/**
 * TransactionContext provides access to the current database transaction context.
 * If no transaction is open, it falls back to the default database connection.
 * It uses AsyncLocalStorage to store and retrieve the current transaction; work that outlives
 * the transaction (e.g. an event handler still running after commit) gets the default connection.
 */
export const TransactionContext = {
	get db(): AppDatabase {
		const store = als.getStore();
		return store?.open ? store.tx : defaultDb;
	},

	/** Whether the caller runs inside a transaction that has not settled yet. */
	get active(): boolean {
		return als.getStore()?.open === true;
	},

	async run<T>(tx: AppDatabase, callback: () => Promise<T>): Promise<T> {
		const store: TTransactionStore = { tx, open: true };
		try {
			return await als.run(store, callback);
		} finally {
			store.open = false;
		}
	},
};

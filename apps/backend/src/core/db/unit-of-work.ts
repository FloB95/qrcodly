import db from './index';
import { TransactionContext } from './transaction-context';
import { withDeadlockRetry } from './with-deadlock-retry';

export class UnitOfWork {
	// runs a callback inside a transaction; all repos using TransactionContext.db share it
	static async run<T>(callback: () => Promise<T>): Promise<T> {
		return withDeadlockRetry(() =>
			db.transaction(async (tx) => {
				return TransactionContext.run(tx, callback);
			}),
		);
	}
}

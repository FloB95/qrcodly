import db from './index';
import { TransactionContext } from './transaction-context';
import { withDeadlockRetry } from './with-deadlock-retry';

export class UnitOfWork {
	// runs a callback inside a transaction; all repos using TransactionContext.db share it. A call
	// from inside an open transaction joins it, so use cases can compose without a second connection.
	static async run<T>(callback: () => Promise<T>): Promise<T> {
		if (TransactionContext.active) return callback();
		return withDeadlockRetry(() =>
			db.transaction(async (tx) => {
				return TransactionContext.run(tx, callback);
			}),
		);
	}
}

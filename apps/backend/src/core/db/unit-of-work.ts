import db from './index';
import { TransactionContext } from './transaction-context';

export class UnitOfWork {
	// runs a callback inside a transaction; all repos using TransactionContext.db share it
	static async run<T>(callback: () => Promise<T>): Promise<T> {
		return db.transaction(async (tx) => {
			return TransactionContext.run(tx, callback);
		});
	}
}

import db from '@/core/db';
import { TransactionContext } from '@/core/db/transaction-context';
import { UnitOfWork } from '@/core/db/unit-of-work';

describe('UnitOfWork', () => {
	it('lets a nested run join the open transaction', async () => {
		let outer: unknown;
		let inner: unknown;
		await UnitOfWork.run(async () => {
			outer = TransactionContext.db;
			await UnitOfWork.run(async () => {
				inner = TransactionContext.db;
			});
		});
		expect(outer).not.toBe(db);
		expect(inner).toBe(outer);
	});

	it('rolls the outer transaction back when a nested run throws', async () => {
		const outerRun = UnitOfWork.run(async () => {
			await UnitOfWork.run(async () => {
				throw new Error('inner failure');
			});
		});
		await expect(outerRun).rejects.toThrow('inner failure');
		expect(TransactionContext.active).toBe(false);
	});

	it('hands work that outlives the transaction the default connection', async () => {
		let continuation: Promise<unknown> = Promise.resolve();
		await UnitOfWork.run(async () => {
			expect(TransactionContext.active).toBe(true);
			continuation = new Promise((resolve) => setTimeout(() => resolve(TransactionContext.db), 10));
		});
		expect(await continuation).toBe(db);
	});
});

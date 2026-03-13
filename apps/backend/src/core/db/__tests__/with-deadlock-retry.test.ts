import { isDeadlockError, withDeadlockRetry } from '../with-deadlock-retry';

describe('isDeadlockError', () => {
	it('should detect errno 1213', () => {
		expect(isDeadlockError({ errno: 1213 })).toBe(true);
	});

	it('should detect code ER_LOCK_DEADLOCK', () => {
		expect(isDeadlockError({ code: 'ER_LOCK_DEADLOCK' })).toBe(true);
	});

	it('should return false for other errors', () => {
		expect(isDeadlockError({ errno: 1062, code: 'ER_DUP_ENTRY' })).toBe(false);
		expect(isDeadlockError(new Error('some error'))).toBe(false);
		expect(isDeadlockError(null)).toBe(false);
		expect(isDeadlockError(undefined)).toBe(false);
	});
});

describe('withDeadlockRetry', () => {
	it('should retry on deadlock error', async () => {
		const deadlockError = Object.assign(new Error('Deadlock'), { errno: 1213 });
		const fn = jest.fn().mockRejectedValueOnce(deadlockError).mockResolvedValue('success');

		const result = await withDeadlockRetry(fn);
		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('should not retry on non-deadlock DB errors', async () => {
		const dupError = Object.assign(new Error('Duplicate'), { errno: 1062 });
		const fn = jest.fn().mockRejectedValue(dupError);

		await expect(withDeadlockRetry(fn)).rejects.toThrow('Duplicate');
		expect(fn).toHaveBeenCalledTimes(1);
	});
});

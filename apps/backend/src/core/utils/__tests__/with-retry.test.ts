import { withRetry } from '../with-retry';

describe('withRetry', () => {
	it('should succeed on first try', async () => {
		const fn = jest.fn().mockResolvedValue('ok');
		const result = await withRetry(fn, { isRetryable: () => true });
		expect(result).toBe('ok');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should succeed after retries', async () => {
		const retryableError = new Error('transient');
		const fn = jest
			.fn()
			.mockRejectedValueOnce(retryableError)
			.mockRejectedValueOnce(retryableError)
			.mockResolvedValue('ok');

		const result = await withRetry(fn, {
			maxRetries: 3,
			baseDelayMs: 1,
			maxDelayMs: 5,
			isRetryable: () => true,
		});

		expect(result).toBe('ok');
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('should throw immediately for non-retryable errors', async () => {
		const fatalError = new Error('fatal');
		const fn = jest.fn().mockRejectedValue(fatalError);

		await expect(
			withRetry(fn, {
				maxRetries: 3,
				baseDelayMs: 1,
				isRetryable: () => false,
			}),
		).rejects.toThrow('fatal');

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should throw the last error when retries are exhausted', async () => {
		let attempt = 0;
		const fn = jest.fn().mockImplementation(() => {
			attempt++;
			return Promise.reject(new Error(`fail-${attempt}`));
		});

		await expect(
			withRetry(fn, {
				maxRetries: 2,
				baseDelayMs: 1,
				maxDelayMs: 5,
				isRetryable: () => true,
			}),
		).rejects.toThrow('fail-3');

		expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
	});
});

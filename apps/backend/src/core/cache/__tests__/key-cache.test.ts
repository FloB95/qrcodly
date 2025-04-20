import 'reflect-metadata';
import { container } from 'tsyringe';
import { KeyCache } from '../key-cache';

describe('AppCache (Redis)', () => {
	const appCache = container.resolve(KeyCache);

	afterEach(async () => {
		try {
			if (appCache.status() === 'ready') {
				await appCache.del('test-key');
			}
		} catch {
			// Intentionally left empty
		}
	});

	it('should set and get a value from Redis', async () => {
		const key = 'test-key';
		const value = 'test-value';

		await appCache.set(key, value);
		const cacheCheck = await appCache.get(key);

		expect(cacheCheck).toBe(value);
	});

	it('should set a value with expiration', async () => {
		const key = 'test-key';
		const value = 'test-value';
		const expirationTimeSeconds = 1;

		await appCache.set(key, value, expirationTimeSeconds);
		expect(await appCache.get(key)).toBe(value);

		// Wait for expiration
		await new Promise((resolve) => setTimeout(resolve, 1100));
		expect(await appCache.get(key)).toBeNull(); // Value should be expired
	});

	it('should delete a key from Redis', async () => {
		const key = 'test-key';
		const value = 'test-value';

		await appCache.set(key, value);
		await appCache.del(key);

		expect(await appCache.get(key)).toBeNull();
	});

	it('should disconnect from Redis', async () => {
		appCache.disconnect();
		await expect(appCache.get('test-key')).rejects.toThrow(); // Redis should be disconnected
	});
});

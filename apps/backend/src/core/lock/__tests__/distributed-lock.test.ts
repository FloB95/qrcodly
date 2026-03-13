import { container } from 'tsyringe';
import { DistributedLock } from '../distributed-lock';
import { KeyCache } from '@/core/cache/key-cache';
import { ConflictError } from '@/core/error/http';
import { sleep } from '@/utils/general';

describe('DistributedLock', () => {
	let lock: DistributedLock;
	let cache: KeyCache;

	beforeAll(() => {
		cache = container.resolve(KeyCache);
		lock = new DistributedLock(cache);
	});

	afterAll(async () => {
		await cache.disconnect();
	});

	it('should acquire and release a lock', async () => {
		const handle = await lock.acquire('test:acquire');
		expect(handle).not.toBeNull();
		expect(handle!.key).toBe('lock:test:acquire');

		const released = await lock.release(handle!);
		expect(released).toBe(true);
	});

	it('should block a second acquire while lock is held', async () => {
		const handle1 = await lock.acquire('test:contention', {
			ttlMs: 5000,
		});
		expect(handle1).not.toBeNull();

		const handle2 = await lock.acquire('test:contention', {
			acquireTimeoutMs: 200,
			retryDelayMs: 50,
		});
		expect(handle2).toBeNull();

		await lock.release(handle1!);
	});

	it('should allow acquisition after TTL expiry', async () => {
		const handle1 = await lock.acquire('test:ttl', { ttlMs: 100 });
		expect(handle1).not.toBeNull();

		// Wait for TTL to expire
		await sleep(150);

		const handle2 = await lock.acquire('test:ttl', {
			acquireTimeoutMs: 200,
		});
		expect(handle2).not.toBeNull();

		await lock.release(handle2!);
	});

	it('withLock should execute the function and release', async () => {
		const result = await lock.withLock('test:with-lock', async () => {
			return 42;
		});
		expect(result).toBe(42);

		// Lock should be released — re-acquire should succeed immediately
		const handle = await lock.acquire('test:with-lock', { acquireTimeoutMs: 100 });
		expect(handle).not.toBeNull();
		await lock.release(handle!);
	});

	it('withLock should throw ConflictError on contention', async () => {
		const handle = await lock.acquire('test:conflict', { ttlMs: 5000 });
		expect(handle).not.toBeNull();

		await expect(
			lock.withLock('test:conflict', async () => 'should not reach', {
				acquireTimeoutMs: 200,
				retryDelayMs: 50,
			}),
		).rejects.toThrow(ConflictError);

		await lock.release(handle!);
	});

	it('withLock should release lock even when function throws', async () => {
		await expect(
			lock.withLock('test:error-release', async () => {
				throw new Error('boom');
			}),
		).rejects.toThrow('boom');

		// Lock should be released — acquire should succeed
		const handle = await lock.acquire('test:error-release', { acquireTimeoutMs: 100 });
		expect(handle).not.toBeNull();
		await lock.release(handle!);
	});

	it('should not release lock with wrong token', async () => {
		const handle = await lock.acquire('test:wrong-token', { ttlMs: 5000 });
		expect(handle).not.toBeNull();

		const fakeHandle = { key: handle!.key, token: 'wrong-token' };
		const released = await lock.release(fakeHandle);
		expect(released).toBe(false);

		// Original handle should still work
		const releasedOriginal = await lock.release(handle!);
		expect(releasedOriginal).toBe(true);
	});
});

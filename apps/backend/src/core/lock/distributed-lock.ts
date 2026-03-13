import { inject, singleton } from 'tsyringe';
import { KeyCache } from '@/core/cache/key-cache';
import { ConflictError } from '@/core/error/http/conflict.error';
import { randomString, sleep } from '@/utils/general';

export interface LockOptions {
	/** Lock TTL in milliseconds. Default: 10000 (10s) */
	ttlMs: number;
	/** Max time to wait for lock acquisition in milliseconds. Default: 5000 (5s) */
	acquireTimeoutMs: number;
	/** Delay between acquisition attempts in milliseconds. Default: 50 */
	retryDelayMs: number;
}

export interface LockHandle {
	key: string;
	token: string;
}

const DEFAULT_LOCK_OPTIONS: LockOptions = {
	ttlMs: 10_000,
	acquireTimeoutMs: 5_000,
	retryDelayMs: 50,
};

const LOCK_PREFIX = 'lock:';

// Lua script for atomic check-and-delete (only release if token matches)
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
	return redis.call("del", KEYS[1])
else
	return 0
end
`;

@singleton()
export class DistributedLock {
	constructor(@inject(KeyCache) private cache: KeyCache) {}

	/**
	 * Attempts to acquire a distributed lock.
	 * Returns a LockHandle on success, or null if the lock could not be acquired.
	 */
	async acquire(key: string, options?: Partial<LockOptions>): Promise<LockHandle | null> {
		const opts = { ...DEFAULT_LOCK_OPTIONS, ...options };
		const lockKey = LOCK_PREFIX + key;
		const token = randomString(16);
		const deadline = Date.now() + opts.acquireTimeoutMs;

		while (Date.now() < deadline) {
			const result = await this.cache.getClient().set(lockKey, token, 'PX', opts.ttlMs, 'NX');

			if (result === 'OK') {
				return { key: lockKey, token };
			}

			await sleep(opts.retryDelayMs);
		}

		return null;
	}

	/**
	 * Releases a previously acquired lock. Only succeeds if the token matches.
	 * Uses a Redis Lua script for atomic check-and-delete.
	 */
	async release(handle: LockHandle): Promise<boolean> {
		// Redis EVAL is the standard way to run atomic Lua scripts — not JS eval()
		const client = this.cache.getClient();
		const result = await client.eval(RELEASE_SCRIPT, 1, handle.key, handle.token);
		return result === 1;
	}

	/**
	 * Acquires a lock, executes the function, then releases the lock.
	 * Throws ConflictError if the lock cannot be acquired.
	 */
	async withLock<T>(key: string, fn: () => Promise<T>, options?: Partial<LockOptions>): Promise<T> {
		const handle = await this.acquire(key, options);
		if (!handle) {
			throw new ConflictError();
		}

		try {
			return await fn();
		} finally {
			await this.release(handle);
		}
	}
}

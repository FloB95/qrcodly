import Redis from 'ioredis';
import { singleton } from 'tsyringe';
import { type IKeyCache } from '../interface/key-cache.interface';
import { env } from '../config/env';
import { OnShutdown } from '../decorators/on-shutdown.decorator';
import { cacheOperationDuration, cacheOperations, safely } from '../metrics';

/**
 * Times a Redis call and classifies its result.
 *
 * `classify` exists so reads can report hit/miss instead of a flat "ok" — without that split the
 * counter says how busy Redis is but nothing about whether caching is actually working.
 */
async function track<T>(
	operation: string,
	fn: () => Promise<T>,
	classify: (result: T) => string = () => 'ok',
): Promise<T> {
	const startedAt = Date.now();
	try {
		const result = await fn();
		safely(() => {
			cacheOperationDuration.record(Date.now() - startedAt, { operation });
			cacheOperations.add(1, { operation, result: classify(result) });
		});
		return result;
	} catch (error) {
		safely(() => {
			cacheOperationDuration.record(Date.now() - startedAt, { operation });
			cacheOperations.add(1, { operation, result: 'error' });
		});
		throw error;
	}
}

const hitOrMiss = (result: unknown): string => (result === null ? 'miss' : 'hit');

/**
 * AppCache class for caching data using Redis.
 */
@singleton()
export class KeyCache implements IKeyCache {
	private client: Redis;

	constructor() {
		this.client = new Redis(env.REDIS_URL, {
			maxRetriesPerRequest: 3,
		});
	}

	async set(
		key: string,
		value: string | Buffer | number,
		expirationTimeSeconds?: number,
		tags?: string[],
	): Promise<void> {
		await track('set', async () => {
			if (expirationTimeSeconds) {
				await this.client.set(key, value, 'EX', expirationTimeSeconds);
			} else {
				await this.client.set(key, value);
			}

			if (tags && tags.length > 0) {
				const pipeline = this.client.pipeline();
				for (const tag of tags) {
					pipeline.sadd(`tag:${tag}`, key);
				}
				await pipeline.exec();
			}
		});
	}

	getClient() {
		return this.client;
	}

	async get(key: string): Promise<string | Buffer | number | null> {
		return await track('get', () => this.client.get(key), hitOrMiss);
	}

	async getBuffer(key: string): Promise<Buffer | null> {
		return await track('get_buffer', () => this.client.getBuffer(key), hitOrMiss);
	}

	async del(key: string): Promise<void> {
		await track('del', () => this.client.del(key));
	}

	async invalidateTag(tag: string): Promise<void> {
		await track('invalidate_tag', async () => {
			const tagKey = `tag:${tag}`;
			const keys = await this.client.smembers(tagKey);

			if (keys.length > 0) {
				await this.client.del(...keys);
			}

			await this.client.del(tagKey);
		});
	}

	async disconnect() {
		await this.client.quit();
	}

	async flushAllCache(): Promise<void> {
		await this.client.flushdb();
	}

	status() {
		return this.client.status;
	}

	@OnShutdown()
	async onShutdown() {
		await this.disconnect();
	}
}

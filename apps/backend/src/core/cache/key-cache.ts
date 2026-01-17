import Redis from 'ioredis';
import { singleton } from 'tsyringe';
import { type IKeyCache } from '../interface/key-cache.interface';
import { env } from '../config/env';
import { OnShutdown } from '../decorators/on-shutdown.decorator';

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
		await this.client.set(key, value);
		if (expirationTimeSeconds) {
			await this.client.expire(key, expirationTimeSeconds);
		}

		if (tags) {
			for (const tag of tags) {
				await this.client.sadd(`tag:${tag}`, key);
			}
		}
	}

	getClient() {
		return this.client;
	}

	async get(key: string): Promise<string | Buffer | number | null> {
		return await this.client.get(key);
	}

	async del(key: string): Promise<void> {
		await this.client.del(key);
	}

	async invalidateTag(tag: string): Promise<void> {
		const tagKey = `tag:${tag}`;
		const keys = await this.client.smembers(tagKey);

		if (keys.length > 0) {
			await this.client.del(...keys);
		}

		await this.client.del(tagKey);
	}

	disconnect() {
		this.client.disconnect();
	}

	async flushAllCache(): Promise<void> {
		await this.client.flushdb();
	}

	status() {
		return this.client.status;
	}

	@OnShutdown()
	onShutdown() {
		this.disconnect();
	}
}

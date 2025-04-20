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
	): Promise<void> {
		await this.client.set(key, value);
		if (expirationTimeSeconds) {
			await this.client.expire(key, expirationTimeSeconds);
		}
	}

	async get(key: string): Promise<string | Buffer | number | null> {
		return await this.client.get(key);
	}

	async del(key: string): Promise<void> {
		await this.client.del(key);
	}

	disconnect() {
		this.client.disconnect();
	}

	status() {
		return this.client.status;
	}

	@OnShutdown()
	onShutdown() {
		this.disconnect();
	}
}

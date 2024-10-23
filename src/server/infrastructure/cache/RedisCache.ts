import { Redis } from "@upstash/redis";
import { env } from "~/env";
import { type IBaseKeyCache } from "~/server/application/cache/IBaseKeyCache";

/**
 * RedisCache class for caching data using Redis.
 */
export class RedisCache implements IBaseKeyCache {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Sets a value in the cache.
   * @param key The key for the cache entry.
   * @param value The value to set.
   * @param expirationTimeSeconds The expiration time in seconds.
   */
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

  /**
   * Gets a value from the cache.
   * @param key The key for the cache entry.
   * @returns The value if found, otherwise null.
   */
  async get(key: string): Promise<string | Buffer | number | null> {
    return await this.client.get(key);
  }

  /**
   * Deletes a value from the cache.
   * @param key The key for the cache entry.
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}

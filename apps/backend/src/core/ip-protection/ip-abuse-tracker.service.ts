import { inject, singleton } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import { Logger } from '@/core/logging';

interface IpAbuseTrackerConfig {
	/** Number of unauthorized attempts before blocking */
	maxAttempts: number;
	/** Time window in seconds for counting attempts */
	windowSeconds: number;
	/** How long to keep the IP blocked in Redis (seconds) */
	blockTtlSeconds: number;
	/** Redis key prefix for all ip-abuse keys */
	redisPrefix: string;
}

const DEFAULT_CONFIG: IpAbuseTrackerConfig = {
	maxAttempts: 30,
	windowSeconds: 3600, // 1 hour
	blockTtlSeconds: 7 * 24 * 3600, // 7 days
	redisPrefix: 'ip_abuse:',
};

/**
 * Tracks abusive IP addresses that repeatedly fail authentication
 * and blocks them via Redis.
 *
 * Flow:
 * 1. Each unauthorized request increments a per-IP counter in Redis.
 * 2. Once the counter reaches {@link IpAbuseTrackerConfig.maxAttempts} within
 *    the time window, the IP is marked as blocked in Redis.
 * 3. Subsequent requests from a blocked IP are rejected early via {@link isBlocked}.
 */
@singleton()
export class IpAbuseTrackerService {
	private readonly config: IpAbuseTrackerConfig;
	private readonly isTestEnvironment: boolean;

	constructor(
		@inject(KeyCache) private readonly cache: KeyCache,
		@inject(Logger) private readonly logger: Logger,
	) {
		this.config = DEFAULT_CONFIG;
		this.isTestEnvironment = process.env.NODE_ENV === 'test';
	}

	/**
	 * Record an unauthorized request from the given IP.
	 * If the threshold is reached, the IP is blocked.
	 */
	async trackUnauthorizedAttempt(ip: string | undefined): Promise<void> {
		if (!ip || this.isTestEnvironment) return;

		try {
			const attemptsKey = `${this.config.redisPrefix}attempts:${ip}`;
			const client = this.cache.getClient();

			const attempts = await client.incr(attemptsKey);
			if (attempts === 1) {
				await client.expire(attemptsKey, this.config.windowSeconds);
			}

			this.logger.debug('ip.abuse.attempt', { ip, attempts });

			if (attempts >= this.config.maxAttempts) {
				await this.blockIp(ip);
			}
		} catch (error) {
			this.logger.error('ip.abuse.tracking.failed', { error: error as Error, ip });
		}
	}

	/**
	 * Check whether an IP is currently blocked.
	 * Uses a fast Redis key lookup (O(1)).
	 */
	async isBlocked(ip: string | undefined): Promise<boolean> {
		if (!ip || this.isTestEnvironment) return false;

		try {
			const blockedKey = `${this.config.redisPrefix}blocked:${ip}`;
			return (await this.cache.get(blockedKey)) !== null;
		} catch (error) {
			this.logger.error('ip.abuse.check.failed', { error: error as Error, ip });
			return false;
		}
	}

	private async blockIp(ip: string): Promise<void> {
		const blockedKey = `${this.config.redisPrefix}blocked:${ip}`;

		// Already blocked - skip
		if ((await this.cache.get(blockedKey)) !== null) return;

		// Mark as blocked in Redis
		await this.cache.set(blockedKey, '1', this.config.blockTtlSeconds);

		this.logger.warn('ip.abuse.blocked', {
			ip,
			reason: 'Too many unauthorized requests',
			config: {
				maxAttempts: this.config.maxAttempts,
				windowSeconds: this.config.windowSeconds,
			},
		});
	}
}

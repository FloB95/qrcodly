import { inject, singleton } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import { Logger } from '@/core/logging';
import { UserBanService } from '@/core/auth';

// ban once a user exceeds this many attempts (i.e. on the 3rd)
const MAX_VIOLATIONS = 2;
const WINDOW_SECONDS = 30 * 24 * 3600; // rolling 30-day window
const MAX_TRACKED_URLS = 20; // cap the audit trail per user
const COUNT_PREFIX = 'url_safety:violations:';
const URLS_PREFIX = 'url_safety:violations:urls:';

export interface ViolationResult {
	banned: boolean;
	violationCount: number;
}

/** Tracks malicious-destination attempts per user in Redis and auto-bans repeat offenders. */
@singleton()
export class UrlSafetyViolationTracker {
	constructor(
		@inject(KeyCache) private readonly cache: KeyCache,
		@inject(Logger) private readonly logger: Logger,
		@inject(UserBanService) private readonly userBanService: UserBanService,
	) {}

	async recordViolation(
		userId: string,
		url: string,
		threatTypes: string[],
		context: string,
	): Promise<ViolationResult> {
		const client = this.cache.getClient();
		const countKey = `${COUNT_PREFIX}${userId}`;
		const urlsKey = `${URLS_PREFIX}${userId}`;

		const violationCount = await client.incr(countKey);
		// refresh the TTL on every hit so the counter is never left without an expiry
		await client.expire(countKey, WINDOW_SECONDS);

		// audit trail of offending hosts (capped, expiring) — redacted, never full URLs
		await client.rpush(
			urlsKey,
			JSON.stringify({ host: this.redactUrl(url), threatTypes, context }),
		);
		await client.ltrim(urlsKey, -MAX_TRACKED_URLS, -1);
		await client.expire(urlsKey, WINDOW_SECONDS);

		this.logger.warn('url_safety.violation', {
			userId,
			destinationHost: this.redactUrl(url),
			threatTypes,
			violationCount,
			context,
		});

		if (violationCount > MAX_VIOLATIONS) {
			const flaggedHosts = await this.readTrail(urlsKey);
			await this.userBanService.ban(userId, {
				reason: 'repeated-malicious-destination-urls',
				source: 'system:web-risk',
				details: { violationCount, flaggedHosts },
			});
			// clear on ban so a later unban starts fresh, not instantly re-banned
			try {
				await this.clearViolations(userId);
			} catch (error) {
				this.logger.error('url_safety.clear_violations_failed', {
					userId,
					error: error as Error,
				});
			}
			return { banned: true, violationCount };
		}

		return { banned: false, violationCount };
	}

	// reset a user's strike counter + trail (called on ban; also for an unban flow)
	async clearViolations(userId: string): Promise<void> {
		const client = this.cache.getClient();
		await client.del(`${COUNT_PREFIX}${userId}`);
		await client.del(`${URLS_PREFIX}${userId}`);
	}

	// hostname only — never persist/log full user-supplied URLs (paths/queries may carry secrets/PII)
	private redactUrl(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return '[invalid-url]';
		}
	}

	private async readTrail(urlsKey: string): Promise<unknown[]> {
		try {
			const raw = await this.cache.getClient().lrange(urlsKey, 0, -1);
			return raw.map((entry) => {
				try {
					return JSON.parse(entry);
				} catch {
					return entry;
				}
			});
		} catch {
			return [];
		}
	}
}

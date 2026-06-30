import crypto from 'node:crypto';
import { inject, singleton } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import { Logger } from '@/core/logging';
import { env } from '@/core/config/env';

const WEB_RISK_ENDPOINT = 'https://webrisk.googleapis.com/v1/uris:search';
const THREAT_TYPES = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'] as const;
const REQUEST_TIMEOUT_MS = 4000;
const SAFE_CACHE_TTL_SECONDS = 5 * 60; // short TTL so a newly-listed threat isn't allow-cached for long
const CACHE_PREFIX = 'url_safety:lookup:';

export interface UrlSafetyVerdict {
	safe: boolean;
	threatTypes?: string[];
}

/** Google Web Risk lookup client. Fail-open: missing key or any API error → { safe: true }. */
@singleton()
export class WebRiskService {
	constructor(
		@inject(KeyCache) private readonly cache: KeyCache,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async isSafe(url: string): Promise<UrlSafetyVerdict> {
		const apiKey = env.GOOGLE_WEB_RISK_API_KEY;
		if (!apiKey) return { safe: true };

		const cacheKey = `${CACHE_PREFIX}${crypto.createHash('sha256').update(url).digest('hex')}`;

		try {
			if ((await this.cache.get(cacheKey)) === 'safe') return { safe: true };
		} catch {
			// cache read failure is non-fatal — fall through to a live lookup
		}

		try {
			const params = new URLSearchParams({ key: apiKey, uri: url });
			for (const threatType of THREAT_TYPES) params.append('threatTypes', threatType);

			const response = await fetch(`${WEB_RISK_ENDPOINT}?${params.toString()}`, {
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});

			if (!response.ok) {
				this.logger.warn('url_safety.web_risk_unavailable', { status: response.status });
				return { safe: true };
			}

			const body = (await response.json()) as { threat?: { threatTypes?: string[] } };
			if (body.threat) {
				return { safe: false, threatTypes: body.threat.threatTypes ?? [] };
			}

			await this.cache.set(cacheKey, 'safe', SAFE_CACHE_TTL_SECONDS).catch(() => undefined);
			return { safe: true };
		} catch (error) {
			this.logger.warn('url_safety.web_risk_unavailable', { error: error as Error });
			return { safe: true };
		}
	}
}

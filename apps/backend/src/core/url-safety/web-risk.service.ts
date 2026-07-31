import crypto from 'node:crypto';
import { inject, singleton } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import { Logger } from '@/core/logging';
import { env } from '@/core/config/env';
import { withRetry } from '@/core/utils/with-retry';
import { trackExternal } from '@/core/metrics';

const WEB_RISK_ENDPOINT = 'https://webrisk.googleapis.com/v1/uris:search';
const THREAT_TYPES = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'] as const;
const REQUEST_TIMEOUT_MS = 4000;
const SAFE_CACHE_TTL_SECONDS = 5 * 60; // short TTL so a newly-listed threat isn't allow-cached for long
const CACHE_PREFIX = 'url_safety:lookup:';

export interface UrlSafetyVerdict {
	safe: boolean;
	threatTypes?: string[];
}

/** Why a lookup could not produce an answer. Never conflated with "safe". */
export type TUrlSafetyUnknownReason = 'no_api_key' | 'http_error' | 'timeout' | 'exception';

export type TUrlSafetyLookupStatus = 'safe' | 'unsafe' | 'unknown';

export interface UrlSafetyLookup {
	status: TUrlSafetyLookupStatus;
	threatTypes?: string[];
	unknownReason?: TUrlSafetyUnknownReason;
	/** True when the answer came from the short-lived safe-verdict cache. */
	fromCache?: boolean;
}

class WebRiskHttpError extends Error {
	constructor(
		readonly status: number,
		readonly retryable: boolean,
	) {
		super(`Web Risk returned ${status}`);
	}
}

const isRetryable = (error: unknown): boolean => {
	if (error instanceof WebRiskHttpError) return error.retryable;
	// undici surfaces network failures as TypeError and timeouts as AbortError
	return error instanceof Error && (error.name === 'TypeError' || error.name === 'AbortError');
};

/**
 * Google Web Risk lookup client.
 *
 * Two entry points on purpose:
 * - {@link WebRiskService.lookup} is three-valued. A background job must be able to tell "Google
 *   says this is clean" from "we could not ask", because treating an outage as clean would silently
 *   certify the whole corpus as safe and push every re-check date a week forward.
 * - {@link WebRiskService.isSafe} keeps the original fail-open contract for the synchronous
 *   create/update path, where a Google outage must never block a paying customer.
 */
@singleton()
export class WebRiskService {
	constructor(
		@inject(KeyCache) private readonly cache: KeyCache,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async lookup(url: string): Promise<UrlSafetyLookup> {
		const apiKey = env.GOOGLE_WEB_RISK_API_KEY;
		if (!apiKey) return { status: 'unknown', unknownReason: 'no_api_key' };

		const cacheKey = `${CACHE_PREFIX}${crypto.createHash('sha256').update(url).digest('hex')}`;

		try {
			if ((await this.cache.get(cacheKey)) === 'safe') {
				return { status: 'safe', fromCache: true };
			}
		} catch {
			// cache read failure is non-fatal — fall through to a live lookup
		}

		try {
			const body = await withRetry(() => this.requestVerdict(url, apiKey), {
				maxRetries: 2,
				baseDelayMs: 250,
				maxDelayMs: 2000,
				isRetryable,
			});

			if (body.threat) {
				return { status: 'unsafe', threatTypes: body.threat.threatTypes ?? [] };
			}

			await this.cache.set(cacheKey, 'safe', SAFE_CACHE_TTL_SECONDS).catch(() => undefined);
			return { status: 'safe' };
		} catch (error) {
			return { status: 'unknown', unknownReason: this.classify(error) };
		}
	}

	/** Fail-open adapter: anything other than a definite threat reads as safe. */
	async isSafe(url: string): Promise<UrlSafetyVerdict> {
		const result = await this.lookup(url);
		if (result.status === 'unsafe') {
			return { safe: false, threatTypes: result.threatTypes ?? [] };
		}
		return { safe: true };
	}

	private classify(error: unknown): TUrlSafetyUnknownReason {
		if (error instanceof WebRiskHttpError) {
			this.logger.warn('url_safety.web_risk_unavailable', { status: error.status });
			return 'http_error';
		}

		const reason: TUrlSafetyUnknownReason =
			error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'exception';
		this.logger.warn('url_safety.web_risk_unavailable', { error: error as Error, reason });
		return reason;
	}

	private async requestVerdict(
		url: string,
		apiKey: string,
	): Promise<{ threat?: { threatTypes?: string[] } }> {
		const params = new URLSearchParams({ key: apiKey, uri: url });
		for (const threatType of THREAT_TYPES) params.append('threatTypes', threatType);

		const response = await trackExternal('web_risk', 'uris_search', () =>
			fetch(`${WEB_RISK_ENDPOINT}?${params.toString()}`, {
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			}),
		);

		if (!response.ok) {
			// 4xx other than 429 is our own fault (bad key, malformed request) and will not fix itself
			const retryable = response.status >= 500 || response.status === 429;
			throw new WebRiskHttpError(response.status, retryable);
		}

		return (await response.json()) as { threat?: { threatTypes?: string[] } };
	}
}

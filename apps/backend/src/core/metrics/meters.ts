import { metrics, type ObservableResult } from '@opentelemetry/api';
import type Redis from 'ioredis';

const meter = metrics.getMeter('qrcodly-backend', '1.0.0');

const ACTIVE_SESSIONS_KEY = 'otel:active_sessions';
const ACTIVE_SESSIONS_TTL_MS = 5 * 60 * 1000; // 5 minutes

// --- HTTP Request Metrics ---

export const httpRequestDuration = meter.createHistogram('http.server.request.duration', {
	description: 'Duration of HTTP server requests',
	unit: 'ms',
	advice: { explicitBucketBoundaries: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000] },
});

export const httpRequestsTotal = meter.createCounter('http.server.requests.total', {
	description: 'Total number of HTTP requests',
});

export const httpErrorsTotal = meter.createCounter('http.server.errors.total', {
	description: 'Total number of HTTP error responses (4xx and 5xx)',
});

export const httpActiveRequests = meter.createUpDownCounter('http.server.active_requests', {
	description: 'Number of currently active HTTP requests',
});

// --- Business Metrics ---

export const qrCodesCreated = meter.createCounter('business.qr_codes.created', {
	description: 'Total QR codes created',
});

export const qrCodesBulkImported = meter.createCounter('business.qr_codes.bulk_imported', {
	description: 'Total QR codes created via bulk import',
});

export const qrCodesDeleted = meter.createCounter('business.qr_codes.deleted', {
	description: 'Total QR codes deleted',
});

export const shortUrlsCreated = meter.createCounter('business.short_urls.created', {
	description: 'Total short URLs created',
});

export const shortUrlsDeleted = meter.createCounter('business.short_urls.deleted', {
	description: 'Total short URLs deleted',
});

export const shortUrlScans = meter.createCounter('business.short_urls.scans', {
	description: 'Total short URL / QR code scans',
});

// --- Active Sessions ---

/**
 * Records a user as active in Redis (sorted set with timestamp as score).
 * Call this on each authenticated request.
 */
export async function trackActiveSession(redis: Redis, userId: string): Promise<void> {
	const now = Date.now();
	await redis.zadd(ACTIVE_SESSIONS_KEY, now, userId);
}

/**
 * Registers an observable gauge that reports the number of active sessions.
 * Must be called once after Redis is available (e.g., during server build).
 */
export function registerActiveSessionsGauge(redis: Redis): void {
	meter
		.createObservableGauge('business.active_sessions', {
			description: 'Number of unique users active in the last 5 minutes',
		})
		.addCallback(async (result: ObservableResult) => {
			const cutoff = Date.now() - ACTIVE_SESSIONS_TTL_MS;
			// Remove stale entries
			await redis.zremrangebyscore(ACTIVE_SESSIONS_KEY, '-inf', cutoff);
			// Count remaining
			const count = await redis.zcard(ACTIVE_SESSIONS_KEY);
			result.observe(count);
		});
}

// --- Rate Limiting ---

export const rateLimitHits = meter.createCounter('http.rate_limit.hits', {
	description: 'Number of requests that hit rate limits',
});

import { metrics } from '@opentelemetry/api';
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

export const qrCodesUpdated = meter.createCounter('business.qr_codes.updated', {
	description: 'Total QR codes updated',
});

export const qrCodesDuplicated = meter.createCounter('business.qr_codes.duplicated', {
	description: 'Total QR codes duplicated',
});

export const shortUrlsCreated = meter.createCounter('business.short_urls.created', {
	description: 'Total short URLs created',
});

export const shortUrlsDeleted = meter.createCounter('business.short_urls.deleted', {
	description: 'Total short URLs deleted',
});

export const shortUrlsUpdated = meter.createCounter('business.short_urls.updated', {
	description: 'Total short URLs updated',
});

export const shortUrlsDuplicated = meter.createCounter('business.short_urls.duplicated', {
	description: 'Total short URLs duplicated',
});

export const shortUrlScans = meter.createCounter('business.short_urls.scans', {
	description: 'Total short URL / QR code scans',
});

// --- Analytics Forwarding ---

/**
 * Scan events handed to Umami, split by what Umami actually did with them.
 * The gap between this and `shortUrlScans` is the reason dashboard numbers
 * disagree with the scan count — see UmamiAnalyticsService.sendEvent.
 */
export const umamiEventsTotal = meter.createCounter('analytics.umami.events.total', {
	description: 'Scan events forwarded to Umami, by outcome',
});

// --- URL Safety ---

/**
 * Every destination screening, by where it came from and what came back.
 *
 * The `unknown` verdict label is what makes this readable at all: the synchronous path is
 * fail-open, so without separating "Google said clean" from "we could not ask", a Web Risk outage
 * would show up as a corpus with a perfect safety record.
 *
 * Labels: source = create|update|duplicate|recheck, verdict = safe|unsafe|unknown
 */
export const urlSafetyChecks = meter.createCounter('url_safety.checks.total', {
	description: 'Destination URL safety lookups, by source and verdict',
});

/** Labels: source, threat_type, mode = shadow|enforce */
export const urlSafetyBlocks = meter.createCounter('url_safety.blocks.total', {
	description: 'Short URLs blocked because their destination was flagged',
});

/** Labels: reason = self_healed|manual|destination_changed. This is the false-positive signal. */
export const urlSafetyUnblocks = meter.createCounter('url_safety.unblocks.total', {
	description: 'Safety blocks lifted again, by reason',
});

/** Labels: outcome = warned|banned|not_counted. Gives the warn→ban conversion rate. */
export const urlSafetyOffences = meter.createCounter('url_safety.offences.total', {
	description: 'Offences recorded against the warn→ban ladder, by outcome',
});

/** Labels: channel = email|in_app, outcome = sent|failed. Did the user actually hear about it? */
export const urlSafetyNotifications = meter.createCounter('url_safety.notifications.total', {
	description: 'Safety notifications dispatched, by channel and outcome',
});

export const urlSafetyRecheckDuration = meter.createHistogram('url_safety.recheck.duration', {
	description: 'Wall-clock duration of a re-check job run',
	unit: 'ms',
	advice: { explicitBucketBoundaries: [1000, 5000, 15000, 60000, 120000, 300000, 480000] },
});

const urlSafetyBacklogGauge = meter.createGauge('url_safety.recheck.backlog', {
	description: 'Short URLs whose safety re-check is overdue',
});

/** Reported at the end of each run — a number that keeps climbing means the tiers are too tight. */
export function recordUrlSafetyBacklog(count: number): void {
	urlSafetyBacklogGauge.record(count);
}

// --- Active Sessions ---

const activeSessionsGauge = meter.createGauge('business.active_sessions', {
	description: 'Number of unique users active in the last 5 minutes',
});

let lastCleanup = 0;

/**
 * Records a user as active in Redis and reports the absolute count.
 * Cleanup of stale entries runs at most once per minute.
 */
export async function trackActiveSession(redis: Redis, userId: string): Promise<void> {
	const now = Date.now();
	await redis.zadd(ACTIVE_SESSIONS_KEY, now, userId);

	if (now - lastCleanup > 60_000) {
		lastCleanup = now;
		await redis.zremrangebyscore(ACTIVE_SESSIONS_KEY, '-inf', now - ACTIVE_SESSIONS_TTL_MS);
		const count = await redis.zcard(ACTIVE_SESSIONS_KEY);
		activeSessionsGauge.record(count);
	}
}

// --- Rate Limiting ---

/** Labels: route, policy. Without them you only learn that we throttled, never where. */
export const rateLimitHits = meter.createCounter('http.rate_limit.hits', {
	description: 'Number of requests that hit rate limits',
});

// --- Cron Jobs ---

/**
 * Labels: job, outcome = success|failed|skipped_locked
 *
 * `skipped_locked` is the one that matters: a job whose Redis lock is never released stops
 * running entirely, and until now that failure mode produced nothing but a debug line.
 */
export const cronRuns = meter.createCounter('cron.runs.total', {
	description: 'Cron job executions, by job and outcome',
});

/** Labels: job */
export const cronDuration = meter.createHistogram('cron.duration', {
	description: 'Wall-clock duration of a cron job run',
	unit: 'ms',
	advice: { explicitBucketBoundaries: [100, 500, 1000, 5000, 15000, 60000, 300000, 600000] },
});

// --- Mail ---

/** Labels: template, outcome = sent|failed */
export const mailSent = meter.createCounter('mail.sent.total', {
	description: 'Emails handed to the SMTP transport, by template and outcome',
});

/** Labels: template */
export const mailDuration = meter.createHistogram('mail.send.duration', {
	description: 'Duration of an SMTP send',
	unit: 'ms',
	advice: { explicitBucketBoundaries: [50, 100, 250, 500, 1000, 2500, 5000, 10000] },
});

// --- Database ---

/** Labels: operation = select|insert|update|delete|other */
export const dbQueryDuration = meter.createHistogram('db.query.duration', {
	description: 'Duration of a MySQL query',
	unit: 'ms',
	advice: { explicitBucketBoundaries: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000] },
});

/** Labels: operation, outcome = ok|error */
export const dbQueries = meter.createCounter('db.queries.total', {
	description: 'MySQL queries executed, by operation and outcome',
});

/** Every retry here is contention the pool absorbed silently. */
export const dbDeadlockRetries = meter.createCounter('db.deadlock.retries.total', {
	description: 'Query retries triggered by a MySQL deadlock',
});

// --- Cache (Redis) ---

/**
 * Labels: operation = get|set|del|invalidate_tag, result = hit|miss|ok|error
 *
 * The hit/miss split only applies to reads; writes report `ok`.
 */
export const cacheOperations = meter.createCounter('cache.operations.total', {
	description: 'Redis cache operations, by operation and result',
});

/** Labels: operation */
export const cacheOperationDuration = meter.createHistogram('cache.operation.duration', {
	description: 'Duration of a Redis cache operation',
	unit: 'ms',
	advice: { explicitBucketBoundaries: [1, 2, 5, 10, 25, 50, 100, 250, 1000] },
});

// --- Object Storage (S3 / MinIO) ---

/** Labels: operation = get|upload|copy|delete|signed_url, outcome = ok|error */
export const storageOperations = meter.createCounter('storage.operations.total', {
	description: 'Object storage operations, by operation and outcome',
});

/** Labels: operation */
export const storageOperationDuration = meter.createHistogram('storage.operation.duration', {
	description: 'Duration of an object storage operation',
	unit: 'ms',
	advice: { explicitBucketBoundaries: [10, 25, 50, 100, 250, 500, 1000, 2500, 10000] },
});

// --- External Dependencies ---

/**
 * Every outbound call to a third party, recorded through `trackExternal`.
 *
 * Labels: provider = stripe|clerk|cloudflare|umami|web_risk|screenshot|google_analytics|matomo,
 * operation, outcome = ok|error
 */
export const externalRequests = meter.createCounter('external.requests.total', {
	description: 'Outbound requests to third-party APIs, by provider and outcome',
});

/** Labels: provider, operation */
export const externalRequestDuration = meter.createHistogram('external.request.duration', {
	description: 'Duration of an outbound third-party API call',
	unit: 'ms',
	advice: { explicitBucketBoundaries: [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000] },
});

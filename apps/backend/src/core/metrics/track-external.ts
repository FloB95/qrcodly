import { externalRequestDuration, externalRequests } from './meters';
import { safely } from './safely';

export type ExternalProvider =
	| 'stripe'
	| 'clerk'
	| 'cloudflare'
	| 'umami'
	| 'web_risk'
	| 'screenshot'
	| 'google_analytics'
	| 'matomo';

/**
 * Times an outbound third-party call and records its outcome.
 *
 * Wrapping instead of instrumenting each call site by hand keeps the provider/operation label
 * pair consistent, which is what makes "is Stripe slow or are we slow?" answerable at all.
 * The error is always rethrown — this only observes.
 *
 * `operation` must be a fixed, low-cardinality name. Never interpolate an id, url or user input
 * into it: every distinct value becomes a permanently retained time series.
 */
export async function trackExternal<T>(
	provider: ExternalProvider,
	operation: string,
	fn: () => Promise<T>,
): Promise<T> {
	const startedAt = Date.now();
	const attrs = { provider, operation };

	try {
		const result = await fn();
		safely(() => {
			externalRequestDuration.record(Date.now() - startedAt, attrs);
			externalRequests.add(1, { ...attrs, outcome: 'ok' });
		});
		return result;
	} catch (error) {
		safely(() => {
			externalRequestDuration.record(Date.now() - startedAt, attrs);
			externalRequests.add(1, { ...attrs, outcome: 'error' });
		});
		throw error;
	}
}

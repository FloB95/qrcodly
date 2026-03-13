import { withRetry } from '@/core/utils/with-retry';

/**
 * Checks whether an error is a MySQL deadlock (errno 1213 / ER_LOCK_DEADLOCK).
 */
export function isDeadlockError(error: unknown): boolean {
	if (error == null || typeof error !== 'object') return false;
	const err = error as Record<string, unknown>;
	if (err.errno === 1213) return true;
	if (err.code === 'ER_LOCK_DEADLOCK') return true;
	return false;
}

/**
 * Retries an async function when a MySQL deadlock is detected.
 */
export function withDeadlockRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
	return withRetry(fn, {
		maxRetries,
		baseDelayMs: 50,
		maxDelayMs: 1000,
		isRetryable: isDeadlockError,
	});
}

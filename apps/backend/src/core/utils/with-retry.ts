import { sleep } from '@/utils/general';

export interface RetryOptions {
	maxRetries: number;
	baseDelayMs: number;
	maxDelayMs: number;
	isRetryable: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
	maxRetries: 3,
	baseDelayMs: 50,
	maxDelayMs: 2000,
	isRetryable: () => false,
};

/**
 * Retries an async function with exponential backoff + full jitter.
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options?: Partial<RetryOptions>,
): Promise<T> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	let lastError: unknown;

	for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt >= opts.maxRetries || !opts.isRetryable(error)) {
				throw error;
			}

			const exponentialDelay = opts.baseDelayMs * 2 ** attempt;
			const cappedDelay = Math.min(exponentialDelay, opts.maxDelayMs);
			const jitteredDelay = Math.random() * cappedDelay;
			await sleep(jitteredDelay);
		}
	}

	throw lastError;
}

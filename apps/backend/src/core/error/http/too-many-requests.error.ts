import { RATE_LIMIT_TIME_WINDOW } from '@/core/config/constants';
import { CustomApiError } from './custom-api.error';

/**
 * Represents a TooManyRequestsError, which is an extension of CustomApiError.
 */
export class TooManyRequestsError extends CustomApiError {
	/**
	 * Creates an instance of TooManyRequestsError.
	 * @param retryAfter The number of seconds to wait before making another request.
	 */
	constructor(retryAfter?: string) {
		super(
			`Rate limit exceeded. Please wait ${retryAfter || RATE_LIMIT_TIME_WINDOW} before trying again.`,
			429,
		);
	}
}

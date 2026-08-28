import { CustomApiError } from './custom-api.error';

/**
 * Wraps an unexpected error so it surfaces as a 500 while keeping the original throw site
 * around. Logging and error reporting happen centrally in `fastifyErrorHandler` — doing it
 * here as well would produce a duplicate log line for every server fault.
 */
export class UnhandledServerError extends CustomApiError {
	/** The error this one wraps, carrying the original message and stack. */
	readonly originalError: Error;

	constructor(error: Error, message = 'An unhandled error occurred') {
		super(message, 500);
		this.originalError = error;
	}
}

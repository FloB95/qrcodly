import { CustomApiError } from '@/core/error/http/custom-api.error';
import { type TCustomDomainErrorCode } from './error-codes';

/**
 * Base error class for Custom Domain module.
 * All module-specific errors should extend this class for consistency.
 */
export abstract class CustomDomainError extends CustomApiError {
	constructor(
		message: string,
		statusCode: number,
		public readonly code: TCustomDomainErrorCode,
	) {
		super(message, statusCode);
	}
}

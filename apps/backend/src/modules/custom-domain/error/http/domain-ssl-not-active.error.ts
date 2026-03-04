import { BadRequestError } from '@/core/error/http';

/**
 * Error thrown when attempting an operation that requires active SSL
 * but the domain's SSL is not yet active.
 */
export class DomainSslNotActiveError extends BadRequestError {
	constructor(domain: string) {
		super(`Domain "${domain}" does not have active SSL. Please complete verification first.`);
	}
}

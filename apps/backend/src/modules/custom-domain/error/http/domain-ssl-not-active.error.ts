import { CustomDomainError } from '../custom-domain.error';
import { CUSTOM_DOMAIN_ERROR_CODES } from '../error-codes';

/**
 * Error thrown when attempting an operation that requires active SSL
 * but the domain's SSL is not yet active.
 */
export class DomainSslNotActiveError extends CustomDomainError {
	constructor(domain: string) {
		super(
			`Domain "${domain}" does not have active SSL. Please complete verification first.`,
			400,
			CUSTOM_DOMAIN_ERROR_CODES.SSL_NOT_ACTIVE,
		);
	}
}

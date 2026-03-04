import { BadRequestError } from '@/core/error/http';

/**
 * Error thrown when attempting to use a custom domain that is not fully verified or enabled.
 * A domain is valid for use when: sslStatus === 'active', isEnabled === true,
 * cnameVerified === true, and ownershipStatus === 'verified'.
 */
export class DomainNotValidForUseError extends BadRequestError {
	constructor(domain: string, reason?: string) {
		const message = reason
			? `Custom domain "${domain}" is not valid for use: ${reason}`
			: `Custom domain "${domain}" is not valid for use. Please complete verification first.`;
		super(message);
	}
}

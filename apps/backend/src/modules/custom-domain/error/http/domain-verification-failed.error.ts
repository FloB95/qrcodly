import { BadRequestError } from '@/core/error/http';

export class DomainVerificationFailedError extends BadRequestError {
	constructor(domain: string, reason?: string) {
		const message = reason
			? `Domain verification failed for "${domain}": ${reason}`
			: `Domain verification failed for "${domain}". Please ensure the DNS TXT record is properly configured.`;
		super(message);
	}
}

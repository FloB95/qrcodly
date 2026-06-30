import { BadRequestError } from '@/core/error/http';

export class MaliciousDestinationUrlError extends BadRequestError {
	public readonly errorCode = 'MALICIOUS_DESTINATION_URL' as const;

	constructor() {
		super('The destination URL was flagged as malicious and cannot be used.');
	}
}

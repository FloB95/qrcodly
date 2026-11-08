import { NotFoundError } from '@/core/error/http';

export class HostedPageNotFoundError extends NotFoundError {
	public readonly errorCode = 'HOSTED_PAGE_NOT_FOUND' as const;

	constructor() {
		super('Hosted page not found');
	}
}

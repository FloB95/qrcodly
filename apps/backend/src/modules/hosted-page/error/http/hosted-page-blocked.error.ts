import { NotFoundError } from '@/core/error/http';

/** The code was blocked because it was used for abuse: the visitor gets the blocked-link page. */
export class HostedPageBlockedError extends NotFoundError {
	public readonly errorCode = 'HOSTED_PAGE_BLOCKED' as const;

	constructor() {
		super('This hosted page has been blocked');
	}
}

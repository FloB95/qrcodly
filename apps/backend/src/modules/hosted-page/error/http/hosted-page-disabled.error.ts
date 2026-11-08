import { NotFoundError } from '@/core/error/http';

/** The code exists but is switched off or blocked: the visitor gets the disabled page, not a 404. */
export class HostedPageDisabledError extends NotFoundError {
	public readonly errorCode = 'HOSTED_PAGE_DISABLED' as const;

	constructor() {
		super('This hosted page is currently disabled');
	}
}

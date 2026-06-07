import { ForbiddenError } from './forbidden.error';

export class AccountBannedError extends ForbiddenError {
	public readonly errorCode = 'ACCOUNT_BANNED' as const;

	constructor(message = 'Your account has been suspended.') {
		super(message);
	}
}

import { ForbiddenError } from './forbidden.error';

export class AccountBannedError extends ForbiddenError {
	public readonly errorCode = 'ACCOUNT_BANNED' as const;
	public readonly userId?: string;

	constructor(userId?: string, message = 'Your account has been suspended.') {
		super(message);
		this.userId = userId;
	}
}

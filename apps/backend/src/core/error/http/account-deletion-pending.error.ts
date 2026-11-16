import { ForbiddenError } from './forbidden.error';

export class AccountDeletionPendingError extends ForbiddenError {
	public readonly errorCode = 'ACCOUNT_DELETION_PENDING' as const;

	constructor(
		message = 'Your account is waiting to be deleted and is read-only. Withdraw the deletion request to make changes.',
	) {
		super(message);
	}
}

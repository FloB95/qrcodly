import { BadRequestError } from '@/core/error/http';

/** The confirmation link is unknown, was replaced by a newer one, was withdrawn or has run out. */
export class AccountDeletionLinkInvalidError extends BadRequestError {
	public readonly errorCode = 'ACCOUNT_DELETION_LINK_INVALID' as const;

	constructor() {
		super('This confirmation link is invalid or has expired.');
	}
}

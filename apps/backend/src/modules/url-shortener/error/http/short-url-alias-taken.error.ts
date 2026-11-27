import { ConflictError } from '@/core/error/http';

/** Another short URL on the same custom domain already has this alias. */
export class ShortUrlAliasTakenError extends ConflictError {
	public readonly errorCode = 'SHORT_URL_ALIAS_TAKEN' as const;

	constructor() {
		super('This alias is already in use on this custom domain.');
	}
}

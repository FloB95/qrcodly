import { ConflictError } from '@/core/error/http';
import { ShortUrlAliasErrorCode } from '@shared/schemas';

/** Another short URL on the same custom domain already has this alias. */
export class ShortUrlAliasTakenError extends ConflictError {
	public readonly errorCode = ShortUrlAliasErrorCode.TAKEN;

	constructor() {
		super('This alias is already in use on this custom domain.');
	}
}

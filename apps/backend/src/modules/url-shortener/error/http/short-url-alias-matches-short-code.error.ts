import { ConflictError } from '@/core/error/http';
import { ShortUrlAliasErrorCode } from '@shared/schemas';

/** The alias equals an existing short code. Both are addressed as `/u/<text>`, so a text is never both. */
export class ShortUrlAliasMatchesShortCodeError extends ConflictError {
	public readonly errorCode = ShortUrlAliasErrorCode.MATCHES_SHORT_CODE;

	constructor() {
		super('This alias is not available.');
	}
}

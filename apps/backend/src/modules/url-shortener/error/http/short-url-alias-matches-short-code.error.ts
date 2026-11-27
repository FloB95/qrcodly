import { ConflictError } from '@/core/error/http';

/** The alias equals an existing short code. Both are addressed as `/u/<text>`, so a text is never both. */
export class ShortUrlAliasMatchesShortCodeError extends ConflictError {
	public readonly errorCode = 'SHORT_URL_ALIAS_MATCHES_SHORT_CODE' as const;

	constructor() {
		super('This alias is not available.');
	}
}

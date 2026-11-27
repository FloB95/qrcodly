import { BadRequestError } from '@/core/error/http';

export class ShortUrlAliasRequiresCustomDomainError extends BadRequestError {
	public readonly errorCode = 'SHORT_URL_ALIAS_REQUIRES_CUSTOM_DOMAIN' as const;

	constructor() {
		super('An alias is only possible for a short URL on a custom domain.');
	}
}

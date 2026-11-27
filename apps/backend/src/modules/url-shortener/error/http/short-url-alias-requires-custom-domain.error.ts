import { BadRequestError } from '@/core/error/http';
import { ShortUrlAliasErrorCode } from '@shared/schemas';

export class ShortUrlAliasRequiresCustomDomainError extends BadRequestError {
	public readonly errorCode = ShortUrlAliasErrorCode.REQUIRES_CUSTOM_DOMAIN;

	constructor() {
		super('An alias is only possible for a short URL on a custom domain.');
	}
}

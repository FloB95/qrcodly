import { inject, singleton } from 'tsyringe';
import { ShortUrlAliasConflict } from '@shared/schemas';
import { type CustomApiError } from '@/core/error/http/custom-api.error';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { ShortUrlAliasTakenError } from '../error/http/short-url-alias-taken.error';
import { ShortUrlAliasMatchesShortCodeError } from '../error/http/short-url-alias-matches-short-code.error';

/** The error of each conflict; a new conflict does not compile without one. */
const CONFLICT_ERRORS: Record<ShortUrlAliasConflict, new () => CustomApiError> = {
	[ShortUrlAliasConflict.TAKEN]: ShortUrlAliasTakenError,
	[ShortUrlAliasConflict.MATCHES_SHORT_CODE]: ShortUrlAliasMatchesShortCodeError,
};

/**
 * The one place that knows what keeps an alias from being used on a custom domain. The
 * availability check reports the conflict while the owner types; creating a short URL and
 * setting an alias refuse it with the matching error.
 */
@singleton()
export class ShortUrlAliasService {
	constructor(
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
	) {}

	/** `exceptShortUrlId`: the short URL that may already hold the alias, when it is being changed. */
	async findConflict(
		customDomainId: string,
		alias: string,
		exceptShortUrlId?: string,
	): Promise<ShortUrlAliasConflict | null> {
		const holder = await this.shortUrlRepository.findOneByAlias(customDomainId, alias);
		if (holder && holder.id !== exceptShortUrlId) return ShortUrlAliasConflict.TAKEN;

		if (await this.shortUrlRepository.findOneByShortCode(alias)) {
			return ShortUrlAliasConflict.MATCHES_SHORT_CODE;
		}

		return null;
	}

	async assertAvailable(
		customDomainId: string,
		alias: string,
		exceptShortUrlId?: string,
	): Promise<void> {
		const conflict = await this.findConflict(customDomainId, alias, exceptShortUrlId);
		if (conflict) throw new CONFLICT_ERRORS[conflict]();
	}
}

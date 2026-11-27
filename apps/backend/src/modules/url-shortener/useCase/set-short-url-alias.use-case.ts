import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import { BadRequestError } from '@/core/error/http';
import { isDuplicateEntryError } from '@/core/db/utils';
import { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { TShortUrl, TShortUrlWithDomain } from '../domain/entities/short-url.entity';
import { ShortUrlAliasService } from '../service/short-url-alias.service';
import { ShortUrlAliasRequiresCustomDomainError } from '../error/http/short-url-alias-requires-custom-domain.error';
import { ShortUrlAliasTakenError } from '../error/http/short-url-alias-taken.error';

/**
 * Sets, changes or removes (null) the alias of a short URL, whether it belongs to a QR code or
 * not. Kept out of UpdateShortUrlUseCase, which owns the destination and its safety rules.
 */
@injectable()
export class SetShortUrlAliasUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(ShortUrlAliasService) private shortUrlAliasService: ShortUrlAliasService,
		@inject(CustomDomainValidationService)
		private customDomainValidationService: CustomDomainValidationService,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(
		shortUrl: TShortUrl,
		alias: string | null,
		userId: string,
	): Promise<TShortUrlWithDomain> {
		if (alias !== shortUrl.alias) {
			if (alias !== null) await this.assertCanHave(shortUrl, alias, userId);

			try {
				await this.shortUrlRepository.update(shortUrl, { alias, updatedAt: new Date() });
			} catch (error) {
				// someone took it between the check and the write
				if (isDuplicateEntryError(error)) throw new ShortUrlAliasTakenError();
				throw error;
			}

			this.logger.info('shortUrl.alias.changed', {
				shortUrl: { id: shortUrl.id, alias, previousAlias: shortUrl.alias, updatedBy: userId },
			});
		}

		return (await this.shortUrlRepository.findOneById(shortUrl.id))!;
	}

	private async assertCanHave(shortUrl: TShortUrl, alias: string, userId: string): Promise<void> {
		if (!shortUrl.customDomainId) {
			throw new ShortUrlAliasRequiresCustomDomainError();
		}

		// a reserved code still follows the account's default domain
		const isReserved =
			shortUrl.destinationUrl === null &&
			shortUrl.qrCodeId === null &&
			shortUrl.hostedPageId === null;
		if (isReserved) {
			throw new BadRequestError('A reserved short URL cannot have an alias.');
		}

		await this.customDomainValidationService.validateForUserUse(shortUrl.customDomainId, userId);
		await this.shortUrlAliasService.assertAvailable(shortUrl.customDomainId, alias, shortUrl.id);
	}
}

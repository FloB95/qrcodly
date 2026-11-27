import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import ShortUrlRepository from '../domain/repository/short-url.repository';

/**
 * Translates an alias on a custom domain into its short code, for the custom domain worker.
 * Everything behind the worker only knows short codes, so scans keep counting under the code.
 */
@injectable()
export class ResolveShortUrlAliasUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(CustomDomainValidationService)
		private customDomainValidationService: CustomDomainValidationService,
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
	) {}

	async execute(domain: string, alias: string): Promise<string | undefined> {
		const customDomain = await this.customDomainRepository.findOneByDomain(domain);
		if (!customDomain || !this.customDomainValidationService.isValidForUse(customDomain).isValid) {
			return undefined;
		}

		const shortUrl = await this.shortUrlRepository.findOneByAlias(
			customDomain.id,
			alias.toLowerCase(),
		);
		return shortUrl?.shortCode;
	}
}

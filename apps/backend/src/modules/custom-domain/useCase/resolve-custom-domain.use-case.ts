import { inject, injectable } from 'tsyringe';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { CustomDomainValidationService } from '../service/custom-domain-validation.service';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';

export interface IResolvedDomain {
	domain: string;
	isValid: boolean;
	hasAliases: boolean;
}

/**
 * Use case for resolving a custom domain for the Cloudflare Worker.
 * Returns whether the domain is registered, enabled, and fully verified.
 * This is used by the Cloudflare Worker to validate incoming requests.
 */
@injectable()
export class ResolveCustomDomainUseCase {
	constructor(
		@inject(CustomDomainRepository)
		private readonly customDomainRepository: CustomDomainRepository,
		@inject(CustomDomainValidationService)
		private readonly customDomainValidationService: CustomDomainValidationService,
		@inject(ShortUrlRepository)
		private readonly shortUrlRepository: ShortUrlRepository,
	) {}

	/**
	 * Resolves a domain and checks if it's valid for routing.
	 * A domain is valid if it passes all validation checks in CustomDomainValidationService.
	 *
	 * @param domain - The domain to resolve (e.g., "links.example.com")
	 * @returns The resolved domain information
	 */
	async execute(domain: string): Promise<IResolvedDomain> {
		const customDomain = await this.customDomainRepository.findOneByDomain(domain);

		if (!customDomain) {
			return {
				domain,
				isValid: false,
				hasAliases: false,
			};
		}

		const validationResult = this.customDomainValidationService.isValidForUse(customDomain);

		return {
			domain: customDomain.domain,
			isValid: validationResult.isValid,
			hasAliases:
				validationResult.isValid &&
				(await this.shortUrlRepository.hasAliasOnDomain(customDomain.id)),
		};
	}
}

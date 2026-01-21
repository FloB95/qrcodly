import { inject, injectable } from 'tsyringe';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';

export interface IResolvedDomain {
	domain: string;
	isValid: boolean;
}

/**
 * Use case for resolving a custom domain for the Cloudflare Worker.
 * Returns whether the domain is registered, enabled, and has active SSL.
 * This is used by the Cloudflare Worker to validate incoming requests.
 */
@injectable()
export class ResolveCustomDomainUseCase {
	constructor(
		@inject(CustomDomainRepository)
		private readonly customDomainRepository: CustomDomainRepository,
	) {}

	/**
	 * Resolves a domain and checks if it's valid for routing.
	 * A domain is valid if:
	 * 1. It exists in the database
	 * 2. It is enabled (isEnabled = true)
	 * 3. SSL status is 'active'
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
			};
		}

		const isValid = customDomain.isEnabled && customDomain.sslStatus === 'active';

		return {
			domain: customDomain.domain,
			isValid,
		};
	}
}

import { inject, injectable } from 'tsyringe';
import { ForbiddenError } from '@/core/error/http';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { CustomDomainNotFoundError, DomainNotValidForUseError } from '../error';

/**
 * Result of domain validation check.
 */
export interface IValidationResult {
	isValid: boolean;
	reason?: string;
}

/**
 * Service for centralized custom domain validation.
 *
 * A domain is considered valid for use when ALL of the following are true:
 * - sslStatus === 'active' (SSL certificate is provisioned)
 * - isEnabled === true (domain is enabled by user)
 * - cnameVerified === true (CNAME points to our infrastructure)
 * - ownershipStatus === 'verified' (Cloudflare has verified ownership)
 */
@injectable()
export class CustomDomainValidationService {
	constructor(
		@inject(CustomDomainRepository)
		private readonly customDomainRepository: CustomDomainRepository,
	) {}

	/**
	 * Checks if a domain is valid for use (routing traffic).
	 *
	 * @param domain - The custom domain entity to validate
	 * @returns Validation result with reason if invalid
	 */
	isValidForUse(domain: TCustomDomain): IValidationResult {
		if (!domain.isEnabled) {
			return { isValid: false, reason: 'Domain is disabled' };
		}

		if (!domain.cnameVerified) {
			return { isValid: false, reason: 'CNAME record not verified' };
		}

		if (domain.ownershipStatus !== 'verified') {
			return { isValid: false, reason: 'Ownership not verified' };
		}

		if (domain.sslStatus !== 'active') {
			return { isValid: false, reason: 'SSL certificate not active' };
		}

		return { isValid: true };
	}

	/**
	 * Validates that a domain is ready for use, throwing an error if not.
	 *
	 * @param domain - The custom domain entity to validate
	 * @throws DomainNotValidForUseError if the domain is not valid for use
	 */
	validateForUse(domain: TCustomDomain): void {
		const result = this.isValidForUse(domain);
		if (!result.isValid && result.reason) {
			throw new DomainNotValidForUseError(domain.domain, result.reason);
		}
	}

	/**
	 * Validates that a domain exists, is owned by the user, and is valid for use.
	 * This is the main validation method for use cases that need to verify a domain
	 * before associating it with a short URL.
	 *
	 * @param customDomainId - The ID of the custom domain to validate
	 * @param userId - The ID of the user who should own the domain
	 * @throws CustomDomainNotFoundError if the domain does not exist
	 * @throws ForbiddenError if the user does not own the domain
	 * @throws DomainNotValidForUseError if the domain is not valid for use
	 */
	async validateForUserUse(customDomainId: string, userId: string): Promise<TCustomDomain> {
		const customDomain = await this.customDomainRepository.findOneById(customDomainId);

		if (!customDomain) {
			throw new CustomDomainNotFoundError();
		}

		if (customDomain.createdBy !== userId) {
			throw new ForbiddenError('You do not own this custom domain.');
		}

		this.validateForUse(customDomain);

		return customDomain;
	}
}

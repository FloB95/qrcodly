import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { DnsVerificationService } from '../service/dns-verification.service';
import { DomainVerificationFailedError } from '../error/http/domain-verification-failed.error';

/**
 * Use case for verifying a Custom Domain's CNAME record.
 */
@injectable()
export class VerifyCnameUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(DnsVerificationService) private dnsVerificationService: DnsVerificationService,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Executes the use case to verify a Custom Domain's CNAME record.
	 * @param customDomain The Custom Domain to verify.
	 * @returns A promise that resolves with the updated Custom Domain entity.
	 */
	async execute(customDomain: TCustomDomain): Promise<TCustomDomain> {
		// If CNAME is already valid, return as-is
		if (customDomain.isCnameValid) {
			this.logger.info('customDomain.cname.already_verified', {
				customDomainId: customDomain.id,
				domain: customDomain.domain,
			});
			return customDomain;
		}

		// Verify CNAME record
		const result = await this.dnsVerificationService.verifyCname(customDomain.domain);

		if (!result.success) {
			throw new DomainVerificationFailedError(customDomain.domain, result.message);
		}

		// Update the domain's CNAME status
		await this.customDomainRepository.update(customDomain, { isCnameValid: true });

		// Retrieve the updated Custom Domain entity
		const updatedCustomDomain = await this.customDomainRepository.findOneById(customDomain.id);
		if (!updatedCustomDomain) throw new Error('Failed to retrieve updated Custom Domain');

		this.logger.info('customDomain.cname.verified', {
			customDomain: {
				id: updatedCustomDomain.id,
				domain: updatedCustomDomain.domain,
			},
		});

		return updatedCustomDomain;
	}
}

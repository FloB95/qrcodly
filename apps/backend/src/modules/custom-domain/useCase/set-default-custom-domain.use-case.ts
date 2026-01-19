import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { BadRequestError } from '@/core/error/http';

/**
 * Use case for setting a Custom Domain as the user's default domain for dynamic QR codes.
 */
@injectable()
export class SetDefaultCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Sets a custom domain as the user's default domain.
	 * Only verified domains with valid CNAME records can be set as default.
	 * @param customDomain The Custom Domain to set as default.
	 * @param userId The ID of the user.
	 * @returns A promise that resolves with the updated Custom Domain entity.
	 */
	async execute(customDomain: TCustomDomain, userId: string): Promise<TCustomDomain> {
		// Verify the domain is owned by the user
		if (customDomain.createdBy !== userId) {
			throw new BadRequestError('You can only set your own domains as default.');
		}

		// Domain must be verified before it can be set as default
		if (!customDomain.isVerified) {
			throw new BadRequestError(
				'Domain must be verified before it can be set as default. Please complete the TXT record verification first.',
			);
		}

		// Domain must have a valid CNAME record
		if (!customDomain.isCnameValid) {
			throw new BadRequestError(
				'Domain must have a valid CNAME record pointing to our servers before it can be set as default.',
			);
		}

		// Set this domain as the default (this will also unset any previous default)
		await this.customDomainRepository.setDefault(customDomain.id, userId);

		// Retrieve the updated Custom Domain entity
		const updatedCustomDomain = await this.customDomainRepository.findOneById(customDomain.id);
		if (!updatedCustomDomain) throw new Error('Failed to retrieve updated Custom Domain');

		this.logger.info('customDomain.setDefault', {
			customDomain: {
				id: updatedCustomDomain.id,
				domain: updatedCustomDomain.domain,
			},
			userId,
		});

		return updatedCustomDomain;
	}
}

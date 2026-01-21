import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { BadRequestError } from '@/core/error/http';
import { DomainSslNotActiveError } from '../error/http/domain-ssl-not-active.error';

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
	 * Only domains with active SSL status can be set as default.
	 * @param customDomain The Custom Domain to set as default.
	 * @param userId The ID of the user.
	 * @returns A promise that resolves with the updated Custom Domain entity.
	 */
	async execute(customDomain: TCustomDomain, userId: string): Promise<TCustomDomain> {
		// Verify the domain is owned by the user
		if (customDomain.createdBy !== userId) {
			throw new BadRequestError('You can only set your own domains as default.');
		}

		// Domain must have active SSL status before it can be set as default
		if (customDomain.sslStatus !== 'active') {
			throw new DomainSslNotActiveError(customDomain.domain);
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
				sslStatus: updatedCustomDomain.sslStatus,
			},
			userId,
		});

		return updatedCustomDomain;
	}
}

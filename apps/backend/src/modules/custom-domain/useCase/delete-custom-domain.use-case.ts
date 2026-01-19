import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';

/**
 * Use case for deleting a Custom Domain.
 */
@injectable()
export class DeleteCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Executes the use case to delete a Custom Domain.
	 * Note: Short URLs using this domain will have their customDomainId set to null (cascade behavior).
	 * @param customDomain The Custom Domain to delete.
	 * @returns A promise that resolves when the domain is deleted.
	 */
	async execute(customDomain: TCustomDomain): Promise<void> {
		await this.customDomainRepository.delete(customDomain);

		this.logger.info('customDomain.deleted', {
			customDomain: {
				id: customDomain.id,
				domain: customDomain.domain,
				createdBy: customDomain.createdBy,
			},
		});
	}
}

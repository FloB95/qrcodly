import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { CustomDomainNotFoundError } from '../error/http/custom-domain-not-found.error';

/**
 * Use case for getting a Custom Domain by ID.
 */
@injectable()
export class GetCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
	) {}

	/**
	 * Executes the use case to get a Custom Domain by ID.
	 * @param id The Custom Domain ID.
	 * @returns A promise that resolves with the Custom Domain entity.
	 */
	async execute(id: string): Promise<TCustomDomain> {
		const customDomain = await this.customDomainRepository.findOneById(id);

		if (!customDomain) {
			throw new CustomDomainNotFoundError();
		}

		return customDomain;
	}
}

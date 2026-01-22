import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';

/**
 * List result with pagination metadata.
 */
export interface IListCustomDomainsResult {
	data: TCustomDomain[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

/**
 * Use case for listing Custom Domains for a user.
 */
@injectable()
export class ListCustomDomainsUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
	) {}

	/**
	 * Executes the use case to list Custom Domains for a user.
	 * @param userId The user ID.
	 * @param page The page number (1-indexed).
	 * @param limit The number of items per page.
	 * @returns A promise that resolves with the list of Custom Domains and pagination metadata.
	 */
	async execute(userId: string, page: number, limit: number): Promise<IListCustomDomainsResult> {
		const where = { createdBy: { eq: userId } };

		const [domains, total] = await Promise.all([
			this.customDomainRepository.findAll({ page, limit, where }),
			this.customDomainRepository.countTotal(where),
		]);

		return {
			data: domains,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	}
}

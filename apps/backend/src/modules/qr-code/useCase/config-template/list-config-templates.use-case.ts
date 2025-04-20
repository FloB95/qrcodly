import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../../domain/repository/config-template.repository';
import { ISqlQueryFindBy } from '@/core/interface/repository.interface';
import { TConfigTemplate } from '../../domain/entities/config-template.entity';

/**
 * Use case for retrieving Config Templates based on query parameters.
 */
@injectable()
export class ListConfigTemplatesUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
	) {}

	/**
	 * Executes the use case to retrieve Config Templates based on the provided query parameters.
	 * @param limit The maximum number of Config Templates to retrieve.
	 * @param offset The page number for pagination.
	 * @param where Optional filter criteria for the Config Templates.
	 * @returns An object containing the list of Config Templates and the total count.
	 */
	async execute({ limit, offset: page, where }: ISqlQueryFindBy<TConfigTemplate>) {
		const offset = (page - 1) * limit;

		// Retrieve Config Templates based on the query parameters
		const configTemplates = await this.configTemplateRepository.findAll({
			limit,
			offset,
			where,
		});

		// Count the total number of Config Templates
		const total = await this.configTemplateRepository.countTotal(where);

		return {
			configTemplates,
			total,
		};
	}
}

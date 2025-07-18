import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../domain/repository/config-template.repository';
import { ISqlQueryFindBy } from '@/core/interface/repository.interface';
import { TConfigTemplate } from '../domain/entities/config-template.entity';
import { ImageService } from '@/core/services/image.service';
import { ConfigTemplateImageStrategy } from '../domain/strategies/config-template-image.strategy';

/**
 * Use case for retrieving Config Templates based on query parameters.
 */
@injectable()
export class ListConfigTemplatesUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(ImageService) private imageService: ImageService,
	) {
		this.imageService.setStrategy(new ConfigTemplateImageStrategy());
	}

	/**
	 * Executes the use case to retrieve Config Templates based on the provided query parameters.
	 * @param limit The maximum number of Config Templates to retrieve.
	 * @param page The page number for pagination.
	 * @param where Optional filter criteria for the Config Templates.
	 * @returns An object containing the list of Config Templates and the total count.
	 */
	async execute({ limit, page, where }: ISqlQueryFindBy<TConfigTemplate>) {
		// Retrieve Config Templates based on the query parameters
		const configTemplates = await this.configTemplateRepository.findAll({
			limit,
			page,
			where,
		});

		// Convert image path to presigned URL
		await Promise.all(
			configTemplates.map(async (configTemplate) => {
				if (configTemplate.config.image) {
					configTemplate.config.image = await this.imageService.getSignedUrl(
						configTemplate.config.image,
					);
				}
				if (configTemplate.previewImage) {
					configTemplate.previewImage =
						(await this.imageService.getSignedUrl(configTemplate.previewImage)) ?? null;
				}
			}),
		);

		// Count the total number of Config Templates
		const total = await this.configTemplateRepository.countTotal(where);

		return {
			configTemplates,
			total,
		};
	}
}

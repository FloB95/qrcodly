import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../domain/repository/config-template.repository';
import { TConfigTemplate } from '../domain/entities/config-template.entity';
import { ImageService } from '@/core/services/image.service';
import { ConfigTemplateImageStrategy } from '../domain/strategies/config-template-image.strategy';

/**
 * Use case to retrieve a single ConfigTemplate by its ID.
 * The use case can optionally convert stored image paths to presigned URLs.
 */
@injectable()
export class GetConfigTemplateUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(ImageService) private imageService: ImageService,
	) {
		// Ensure the image service uses the ConfigTemplate-specific strategy.
		this.imageService.setStrategy(new ConfigTemplateImageStrategy());
	}

	/**
	 * Retrieve a ConfigTemplate by ID.
	 *
	 * @param configTemplateId - The ID of the ConfigTemplate to retrieve.
	 * @param convertImagePathToUrl - If true, convert image file paths to presigned URLs.
	 * @returns The found ConfigTemplate with optional image URL conversion, or null if not found.
	 */
	async execute(
		configTemplateId: string,
		convertImagePathToUrl = false,
	): Promise<TConfigTemplate | null> {
		const configTemplate = await this.configTemplateRepository.findOneById(configTemplateId);

		if (!configTemplate) {
			return null;
		}

		// Optionally replace stored image paths with presigned URLs for client access.
		if (convertImagePathToUrl) {
			if (configTemplate.config.image) {
				configTemplate.config.image = await this.imageService.getSignedUrl(
					configTemplate.config.image,
				);
			}
			if (configTemplate.previewImage) {
				configTemplate.previewImage =
					(await this.imageService.getSignedUrl(configTemplate.previewImage)) ?? null;
			}
		}

		return configTemplate;
	}
}

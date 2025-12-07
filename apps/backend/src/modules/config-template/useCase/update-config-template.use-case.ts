import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../domain/repository/config-template.repository';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { TConfigTemplate } from '../domain/entities/config-template.entity';
import { objDiff, TUpdateConfigTemplateDto, UpdateConfigTemplateDto } from '@shared/schemas';
import { ImageService } from '@/core/services/image.service';
import { ConfigTemplateImageStrategy } from '../domain/strategies/config-template-image.strategy';
import { ConfigTemplateUpdatedEvent } from '../event/config-template-updated.event';

/**
 * Use case for updating a ConfigTemplate entity.
 */
@injectable()
export class UpdateConfigTemplateUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ImageService) private imageService: ImageService,
	) {
		this.imageService.setStrategy(new ConfigTemplateImageStrategy());
	}

	/**
	 * Executes the use case to update an existing ConfigTemplate entity based on the given DTO.
	 * Handles image upload/deletion and emits an update event upon successful completion.
	 * @param configTemplate The existing ConfigTemplate entity to be updated.
	 * @param updates The data transfer object containing the updates for the ConfigTemplate.
	 * @param updatedBy The ID of the user who updated the ConfigTemplate.
	 * @returns A promise that resolves with the updated ConfigTemplate entity.
	 */
	async execute(
		configTemplate: TConfigTemplate,
		updates: TUpdateConfigTemplateDto,
		updatedBy: string,
	): Promise<TConfigTemplate> {
		const validatedUpdates: Partial<TConfigTemplate> = UpdateConfigTemplateDto.parse(updates);
		validatedUpdates.updatedAt = new Date();

		const diffs = objDiff(configTemplate, validatedUpdates, [
			'id',
			'previewImage',
			'createdAt',
			'createdBy',
			'updatedAt',
			'isPredefined',
		]) as Partial<TConfigTemplate>;

		// dont update if no changes
		if (Object.keys(diffs).length < 1) {
			return configTemplate;
		}

		if (diffs?.config && validatedUpdates.config) {
			// delete and reupload image if changed
			if (
				configTemplate.config.image &&
				validatedUpdates.config?.image &&
				!validatedUpdates.config.image.includes(configTemplate.config.image)
			) {
				await this.imageService.deleteImage(configTemplate.config.image);

				validatedUpdates.config.image = await this.imageService.uploadImage(
					validatedUpdates.config.image,
					configTemplate.id,
					updatedBy,
				);
			} else if (!validatedUpdates.config?.image && configTemplate.config.image) {
				// delete existing image
				await this.imageService.deleteImage(configTemplate.config.image);
			} else if (!configTemplate.config.image && validatedUpdates.config?.image) {
				// upload new image
				validatedUpdates.config.image = await this.imageService.uploadImage(
					validatedUpdates.config.image,
					configTemplate.id,
					updatedBy,
				);
			} else if (
				configTemplate.config.image &&
				validatedUpdates.config?.image &&
				validatedUpdates.config.image.includes(configTemplate.config.image)
			) {
				// if image is the same clear update dto
				validatedUpdates.config.image = configTemplate.config.image;
			}
		}

		// delete preview image if config changed
		if (diffs?.config && configTemplate.previewImage) {
			await this.imageService.deleteImage(configTemplate.previewImage);
			validatedUpdates.previewImage = null;
		}

		await this.configTemplateRepository.update(configTemplate, validatedUpdates);

		const updatedConfigTemplate = await this.configTemplateRepository.findOneById(
			configTemplate.id,
		);

		const event = new ConfigTemplateUpdatedEvent(updatedConfigTemplate!);
		this.eventEmitter.emit(event);

		this.logger.info('Config template updated successfully', {
			id: updatedConfigTemplate!.id,
			updates: diffs,
			updatedBy,
		});

		return updatedConfigTemplate!;
	}
}

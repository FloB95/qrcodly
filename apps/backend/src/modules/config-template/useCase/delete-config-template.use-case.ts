import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import ConfigTemplateRepository from '../domain/repository/config-template.repository';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { TConfigTemplate } from '../domain/entities/config-template.entity';
import { EventEmitter } from '@/core/event';
import { ConfigTemplateDeletedEvent } from '../event/config-template-deleted.event';
import { ImageService } from '@/core/services/image.service';
import { ConfigTemplateImageStrategy } from '../domain/strategies/config-template-image.strategy';

/**
 * Use case for deleting a ConfigTemplate entity.
 */
@injectable()
export class DeleteConfigTemplateUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ImageService) private imageService: ImageService,
	) {
		this.imageService.setStrategy(new ConfigTemplateImageStrategy());
	}

	/**
	 * Executes the use case to delete a ConfigTemplate entity.
	 * @param configTemplate The ConfigTemplate entity to be deleted.
	 * @returns A promise that resolves to true if the deletion was successful, otherwise false.
	 */
	async execute(configTemplate: TConfigTemplate, deletedBy: string): Promise<boolean> {
		await this.imageService.deleteImage(configTemplate.config.image);
		await this.imageService.deleteImage(configTemplate.previewImage ?? undefined);

		const res = await this.configTemplateRepository.delete(configTemplate);

		// log the deletion
		if (res) {
			// Emit the ConfigTemplateDeletedEvent.
			const event = new ConfigTemplateDeletedEvent(configTemplate);
			this.eventEmitter.emit(event);

			this.logger.info('template.deleted', {
				template: {
					id: configTemplate.id,
					deletedBy,
				},
			});
		} else {
			this.logger.error('error.template.deleted', {
				template: {
					id: configTemplate.id,
					deletedBy,
				},
			});
		}

		return res;
	}
}

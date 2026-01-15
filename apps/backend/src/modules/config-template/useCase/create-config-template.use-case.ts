import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../domain/repository/config-template.repository';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { TConfigTemplate } from '../domain/entities/config-template.entity';
import { TCreateConfigTemplateDto } from '@shared/schemas';
import { ConfigTemplateCreatedEvent } from '../event/config-template-created.event';
import { ImageService } from '@/core/services/image.service';
import { ConfigTemplateImageStrategy } from '../domain/strategies/config-template-image.strategy';
import { UnitOfWork } from '@/core/db/unit-of-work';

@injectable()
export class CreateConfigTemplateUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ImageService) private imageService: ImageService,
	) {
		this.imageService.setStrategy(new ConfigTemplateImageStrategy());
	}

	async execute(dto: TCreateConfigTemplateDto, createdBy: string): Promise<TConfigTemplate> {
		let uploadedImage: string | undefined;

		try {
			return await UnitOfWork.run<TConfigTemplate>(async () => {
				// generate ID before transaction
				const newId = await this.configTemplateRepository.generateId();

				const configTemplate: Omit<TConfigTemplate, 'createdAt' | 'updatedAt'> = {
					id: newId,
					...dto,
					createdBy,
					previewImage: null,
					isPredefined: false,
				};

				// upload image if provided
				if (configTemplate.config.image) {
					const uploaded = await this.imageService.uploadImage(
						configTemplate.config.image,
						newId,
						createdBy,
					);
					uploadedImage = uploaded;
					configTemplate.config.image = uploaded;
				}

				// create template in DB
				await this.configTemplateRepository.create(configTemplate);

				// fetch final entity
				const finalTemplate = await this.configTemplateRepository.findOneById(newId);
				if (!finalTemplate) throw new Error('Failed to retrieve Config Template');

				// emit event
				this.eventEmitter.emit(new ConfigTemplateCreatedEvent(finalTemplate));

				this.logger.info('template.created', {
					template: {
						id: finalTemplate.id,
						createdBy: finalTemplate.createdBy,
					},
				});

				return finalTemplate;
			});
		} catch (error) {
			this.logger.error('error.template.created', { error });

			// rollback uploaded image on failure
			if (uploadedImage) await this.imageService.deleteImage(uploadedImage);
			throw error;
		}
	}
}

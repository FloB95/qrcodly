import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../../domain/repository/config-template.repository';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { TConfigTemplate } from '../../domain/entities/config-template.entity';
import { TCreateConfigTemplateDto } from '@shared/schemas';
import { ConfigTemplateCreatedEvent } from '../../event/config-template-created.event';
import { ImageService } from '../../services/image.service';
import { QrCodeTemplateImageStrategy } from '../../domain/strategies/qr-code-template-image.strategy';

/**
 * Use case for creating a ConfigTemplate entity.
 */
@injectable()
export class CreateConfigTemplateUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ImageService) private imageService: ImageService,
	) {
		this.imageService.setStrategy(new QrCodeTemplateImageStrategy());
	}

	/**
	 * Executes the use case to create a new ConfigTemplate entity based on the given DTO.
	 * @param dto The data transfer object containing the details for the ConfigTemplate to be created.
	 * @param createdBy The ID of the user who created the ConfigTemplate.
	 * @returns A promise that resolves with the newly created ConfigTemplate entity.
	 */
	async execute(dto: TCreateConfigTemplateDto, createdBy: string): Promise<TConfigTemplate> {
		const newId = await this.configTemplateRepository.generateId();

		const configTemplate: Omit<TConfigTemplate, 'createdAt' | 'updatedAt'> = {
			id: newId,
			...dto,
			createdBy,
			previewImage: null,
			isPredefined: false,
		};

		// convert base64 image to buffer and upload to s3
		if (configTemplate.config.image) {
			configTemplate.config.image = await this.imageService.uploadImage(
				configTemplate.config.image,
				newId,
				createdBy,
			);
		}

		await this.configTemplateRepository.create(configTemplate);

		const createdConfigTemplate = await this.configTemplateRepository.findOneById(newId);
		if (!createdConfigTemplate) throw new Error('Failed to create Config Template');

		// Emit the ConfigTemplateCreatedEvent.
		const event = new ConfigTemplateCreatedEvent(createdConfigTemplate);
		this.eventEmitter.emit(event);

		this.logger.info('Config Template created successfully', {
			id: createdConfigTemplate.id,
			createdBy: createdConfigTemplate.createdBy,
		});

		return createdConfigTemplate;
	}
}

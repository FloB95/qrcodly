import { IBaseUseCase } from '@/core/interface/IBaseUseCase';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../../domain/repository/ConfigTemplateRepository';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { TConfigTemplate } from '../../domain/entities/ConfigTemplate';
import { TCreateConfigTemplateDto } from '@shared/schemas';
import { ConfigTemplateCreatedEvent } from '../../event/ConfigTemplateCreatedEvent';

/**
 * Use case for creating a ConfigTemplate entity.
 */
@injectable()
export class CreateConfigTemplateUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
	) {}

	/**
	 * Executes the use case to create a new ConfigTemplate entity based on the given DTO.
	 * @param dto The data transfer object containing the details for the ConfigTemplate to be created.
	 * @param createdBy The ID of the user who created the ConfigTemplate.
	 * @returns A promise that resolves with the newly created ConfigTemplate entity.
	 */
	async execute(dto: TCreateConfigTemplateDto, createdBy: string | null): Promise<TConfigTemplate> {
		const newId = await this.configTemplateRepository.generateId();

		const configTemplate: Omit<TConfigTemplate, 'createdAt' | 'updatedAt'> = {
			id: newId,
			...dto,
			createdBy,
		};

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

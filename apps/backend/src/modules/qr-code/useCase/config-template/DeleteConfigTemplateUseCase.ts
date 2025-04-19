import { IBaseUseCase } from '@/core/interface/IBaseUseCase';
import ConfigTemplateRepository from '../../domain/repository/ConfigTemplateRepository';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { TConfigTemplate } from '../../domain/entities/ConfigTemplate';
import { EventEmitter } from '@/core/event';
import { ConfigTemplateDeletedEvent } from '../../event/ConfigTemplateDeletedEvent';

/**
 * Use case for deleting a ConfigTemplate entity.
 */
@injectable()
export class DeleteConfigTemplateUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
	) {}

	/**
	 * Executes the use case to delete a ConfigTemplate entity.
	 * @param configTemplate The ConfigTemplate entity to be deleted.
	 * @returns A promise that resolves to true if the deletion was successful, otherwise false.
	 */
	async execute(configTemplate: TConfigTemplate, deletedBy: string): Promise<boolean> {
		const res = await this.configTemplateRepository.delete(configTemplate);

		// log the deletion
		if (res) {
			// Emit the ConfigTemplateDeletedEvent.
			const event = new ConfigTemplateDeletedEvent(configTemplate);
			this.eventEmitter.emit(event);

			this.logger.info('Config template deleted successfully', {
				id: configTemplate.id,
				deletedBy: deletedBy,
			});
		} else {
			this.logger.warn('Failed to delete config template', {
				id: configTemplate.id,
			});
		}

		return res;
	}
}

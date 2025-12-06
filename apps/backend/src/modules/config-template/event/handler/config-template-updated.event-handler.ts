import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { container } from 'tsyringe';
import ConfigTemplateRepository from '../../domain/repository/config-template.repository';
import { Logger } from '@/core/logging';
import { ImageService } from '@/core/services/image.service';
import { ConfigTemplateImageStrategy } from '../../domain/strategies/config-template-image.strategy';
import { ConfigTemplateUpdatedEvent } from '../config-template-updated.event';

@EventHandler(ConfigTemplateUpdatedEvent.eventName)
export class ConfigTemplateUpdatedEventHandler extends AbstractEventHandler<ConfigTemplateUpdatedEvent> {
	constructor() {
		super();
	}

	/**
	 * Handles the event.
	 * @param {ConfigTemplateUpdatedEvent} event The event to handle.
	 */
	async handle(event: ConfigTemplateUpdatedEvent): Promise<void> {
		const imageService = container.resolve(ImageService);
		imageService.setStrategy(new ConfigTemplateImageStrategy());
		const configTemplateRepository = container.resolve(ConfigTemplateRepository);
		const logger = container.resolve(Logger);

		// skip if template has an image CURRENTLY not supported or preview image already exists
		if (event.configTemplate.config.image || event.configTemplate.previewImage) {
			logger.debug('Template has an image, skipping preview image generation', {
				id: event.configTemplate.id,
				createdBy: event.configTemplate.createdBy,
			});
			return;
		}

		// generate preview image and upload to s3
		const previewImage = await imageService.generatePreview(event.configTemplate);
		if (previewImage) {
			await configTemplateRepository.update(event.configTemplate, { previewImage });
			logger.debug('Config Template preview image generated and uploaded successfully', {
				id: event.configTemplate.id,
				createdBy: event.configTemplate.createdBy,
			});
		}
	}
}

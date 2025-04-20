import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { ConfigTemplateCreatedEvent } from '../config-template-created.event';
import { container } from 'tsyringe';
import ConfigTemplateRepository from '../../domain/repository/config-template.repository';
import { Logger } from '@/core/logging';
import { ImageService } from '../../services/image.service';
import { QrCodeTemplateImageStrategy } from '../../domain/strategies/qr-code-template-image.strategy';

@EventHandler(ConfigTemplateCreatedEvent.eventName)
export class ConfigTemplateCreatedEventHandler extends AbstractEventHandler<ConfigTemplateCreatedEvent> {
	constructor() {
		super();
	}

	/**
	 * Handles the event.
	 * @param {ConfigTemplateCreatedEvent} event The event to handle.
	 */
	async handle(event: ConfigTemplateCreatedEvent): Promise<void> {
		const imageService = container.resolve(ImageService);
		imageService.setStrategy(new QrCodeTemplateImageStrategy());
		const configTemplateRepository = container.resolve(ConfigTemplateRepository);
		const logger = container.resolve(Logger);

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

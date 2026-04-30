import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import ConfigTemplateRepository from '../domain/repository/config-template.repository';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { TConfigTemplate } from '../domain/entities/config-template.entity';
import { ConfigTemplateCreatedEvent } from '../event/config-template-created.event';
import { ImageService } from '@/core/services/image.service';
import { ConfigTemplateImageStrategy } from '../domain/strategies/config-template-image.strategy';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { CONFIG_TEMPLATE_NAME_MAX_LENGTH } from '@shared/schemas';

@injectable()
export class DuplicateConfigTemplateUseCase implements IBaseUseCase {
	constructor(
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ImageService) private imageService: ImageService,
	) {
		this.imageService.setStrategy(new ConfigTemplateImageStrategy());
	}

	async execute(source: TConfigTemplate, userId: string): Promise<TConfigTemplate> {
		let copiedImage: string | undefined;

		try {
			return await UnitOfWork.run<TConfigTemplate>(async () => {
				const newId = this.configTemplateRepository.generateId();
				const config = structuredClone(source.config);

				if (config.image) {
					copiedImage = await this.imageService.copyImage(config.image, newId, userId);
					config.image = copiedImage;
				}

				const name = this.buildCopyName(source.name);

				const configTemplate: Omit<TConfigTemplate, 'createdAt' | 'updatedAt'> = {
					id: newId,
					name,
					config,
					createdBy: userId,
					previewImage: null,
					isPredefined: false,
				};

				await this.configTemplateRepository.create(configTemplate);

				const finalTemplate = await this.configTemplateRepository.findOneById(newId);
				if (!finalTemplate) throw new Error('Failed to retrieve duplicated config template.');

				this.eventEmitter.emit(new ConfigTemplateCreatedEvent(finalTemplate));
				this.logger.info('template.duplicated', {
					template: { id: finalTemplate.id, sourceId: source.id, createdBy: userId },
				});

				return finalTemplate;
			});
		} catch (error) {
			this.logger.error('error.template.duplicated', { error, sourceId: source.id });

			if (copiedImage) {
				try {
					await this.imageService.deleteImage(copiedImage);
				} catch {}
			}
			throw error;
		}
	}

	private buildCopyName(originalName: string): string {
		const prefix = '(Copy) ';
		const maxLength = CONFIG_TEMPLATE_NAME_MAX_LENGTH;
		if (prefix.length + originalName.length > maxLength) {
			return prefix + originalName.slice(0, maxLength - prefix.length);
		}
		return `${prefix}${originalName}`.trim();
	}
}

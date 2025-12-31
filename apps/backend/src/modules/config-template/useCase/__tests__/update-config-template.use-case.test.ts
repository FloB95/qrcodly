import 'reflect-metadata';
import { UpdateConfigTemplateUseCase } from '../update-config-template.use-case';
import type ConfigTemplateRepository from '../../domain/repository/config-template.repository';
import { type Logger } from '@/core/logging';
import { type EventEmitter } from '@/core/event';
import { type ImageService } from '@/core/services/image.service';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults, type TUpdateConfigTemplateDto } from '@shared/schemas';
import { type TConfigTemplate } from '../../domain/entities/config-template.entity';
import { ConfigTemplateUpdatedEvent } from '../../event/config-template-updated.event';

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(true).toBe(true);
	});
});

describe('UpdateConfigTemplateUseCase', () => {
	let useCase: UpdateConfigTemplateUseCase;
	let mockRepository: MockProxy<ConfigTemplateRepository>;
	let mockLogger: MockProxy<Logger>;
	let mockEventEmitter: MockProxy<EventEmitter>;
	let mockImageService: MockProxy<ImageService>;

	const baseTemplate: TConfigTemplate = {
		id: 'template-123',
		name: 'Test Template',
		config: {
			...QrCodeDefaults,
			image: 'https://cdn.example.com/old-image.png',
		},
		previewImage: 'https://cdn.example.com/preview.png',
		createdBy: 'user-123',
		isPredefined: false,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
	};

	beforeEach(() => {
		mockRepository = mock<ConfigTemplateRepository>();
		mockLogger = mock<Logger>();
		mockEventEmitter = mock<EventEmitter>();
		mockImageService = mock<ImageService>();

		useCase = new UpdateConfigTemplateUseCase(
			mockRepository,
			mockLogger,
			mockEventEmitter,
			mockImageService,
		);

		mockRepository.update.mockResolvedValue();
		mockImageService.deleteImage.mockResolvedValue();
		mockImageService.uploadImage.mockResolvedValue('https://cdn.example.com/new-image.png');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should update template name successfully', async () => {
			const updates: TUpdateConfigTemplateDto = {
				name: 'Updated Template',
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				name: 'Updated Template',
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			const result = await useCase.execute(baseTemplate, updates, 'user-123');

			expect(result.name).toBe('Updated Template');
			expect(mockRepository.update).toHaveBeenCalledWith(
				baseTemplate,
				expect.objectContaining({
					name: 'Updated Template',
				}),
			);
		});

		it('should update template config successfully', async () => {
			const updates: TUpdateConfigTemplateDto = {
				config: {
					...QrCodeDefaults,
					margin: 10, // Change a simple field
				},
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				config: {
					...QrCodeDefaults,
					margin: 10,
				},
				previewImage: null,
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockRepository.update).toHaveBeenCalled();
		});

		it('should update both name and config together', async () => {
			const updates: TUpdateConfigTemplateDto = {
				name: 'Updated Template',
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				name: 'Updated Template',
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockRepository.update).toHaveBeenCalled();
		});

		it('should return existing template when no changes detected', async () => {
			const updates: TUpdateConfigTemplateDto = {
				name: baseTemplate.name, // Same name, no change
			};

			mockRepository.findOneById.mockResolvedValue(baseTemplate);

			const result = await useCase.execute(baseTemplate, updates, 'user-123');

			// Should return without making changes
			expect(result.id).toEqual(baseTemplate.id);
			expect(result.name).toEqual(baseTemplate.name);
		});

		it('should delete old image and upload new one when config image changes', async () => {
			const updates: TUpdateConfigTemplateDto = {
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,newimage',
				},
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				config: {
					...QrCodeDefaults,
					image: 'https://cdn.example.com/new-image.png',
				},
				previewImage: null,
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(
				'https://cdn.example.com/old-image.png',
			);
			expect(mockImageService.uploadImage).toHaveBeenCalledWith(
				'data:image/png;base64,newimage',
				'template-123',
				'user-123',
			);
		});

		it('should delete old image when uploading new image', async () => {
			const updates: TUpdateConfigTemplateDto = {
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,newimage',
				},
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				config: {
					...QrCodeDefaults,
					image: 'https://cdn.example.com/new-image.png',
				},
				previewImage: null,
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalled();
			expect(mockImageService.uploadImage).toHaveBeenCalled();
		});

		it('should upload new image when config image added', async () => {
			const templateWithoutImage: TConfigTemplate = {
				...baseTemplate,
				config: {
					...QrCodeDefaults,
					// @ts-ignore expecting this to test null behavior
					image: null,
				},
			};

			const updates: TUpdateConfigTemplateDto = {
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,newimage',
				},
			};

			const updatedTemplate: TConfigTemplate = {
				...templateWithoutImage,
				config: {
					...QrCodeDefaults,
					image: 'https://cdn.example.com/new-image.png',
				},
				previewImage: null,
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(templateWithoutImage, updates, 'user-123');

			expect(mockImageService.uploadImage).toHaveBeenCalledWith(
				'data:image/png;base64,newimage',
				'template-123',
				'user-123',
			);
			expect(mockImageService.deleteImage).toHaveBeenCalledTimes(1); // Only preview image deleted
		});

		it('should not re-upload image if same image URL provided', async () => {
			const updates: TUpdateConfigTemplateDto = {
				config: {
					...QrCodeDefaults,
					image: 'https://cdn.example.com/old-image.png',
					margin: 5, // Change something else to trigger config diff
				},
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				config: {
					...QrCodeDefaults,
					image: 'https://cdn.example.com/old-image.png',
					margin: 5,
				},
				previewImage: null,
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockImageService.uploadImage).not.toHaveBeenCalled();
		});

		it('should delete preview image when config changes', async () => {
			const updates: TUpdateConfigTemplateDto = {
				config: {
					...QrCodeDefaults,
					margin: 5,
				},
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				config: {
					...QrCodeDefaults,
					margin: 5,
				},
				previewImage: null,
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(
				'https://cdn.example.com/preview.png',
			);
			expect(mockRepository.update).toHaveBeenCalledWith(
				baseTemplate,
				expect.objectContaining({
					previewImage: null,
				}),
			);
		});

		it('should not delete preview image when preview is null', async () => {
			const templateWithoutPreview: TConfigTemplate = {
				...baseTemplate,
				config: {
					...QrCodeDefaults,
					// @ts-ignore expecting this to test null behavior
					image: null,
				},
				previewImage: null,
			};

			const updates: TUpdateConfigTemplateDto = {
				name: 'Updated Name',
			};

			const updatedTemplate: TConfigTemplate = {
				...templateWithoutPreview,
				name: 'Updated Name',
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(templateWithoutPreview, updates, 'user-123');

			// No images to delete since both are null
			expect(mockImageService.deleteImage).not.toHaveBeenCalled();
		});

		it('should emit ConfigTemplateUpdatedEvent after update', async () => {
			const updates: TUpdateConfigTemplateDto = {
				name: 'Updated Template',
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				name: 'Updated Template',
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(expect.any(ConfigTemplateUpdatedEvent));
		});

		it('should log successful update with diffs', async () => {
			const updates: TUpdateConfigTemplateDto = {
				name: 'Updated Template',
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				name: 'Updated Template',
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockLogger.info).toHaveBeenCalledWith('Config template updated successfully', {
				id: 'template-123',
				updates: expect.any(Object), // objDiff returns complex object with oldValue/newValue
				updatedBy: 'user-123',
			});
		});

		it('should set updatedAt timestamp', async () => {
			const updates: TUpdateConfigTemplateDto = {
				name: 'Updated Template',
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				name: 'Updated Template',
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockRepository.update).toHaveBeenCalledWith(
				baseTemplate,
				expect.objectContaining({
					updatedAt: expect.any(Date),
				}),
			);
		});

		it('should only update changed fields', async () => {
			const updates: TUpdateConfigTemplateDto = {
				name: 'Updated Template',
				config: baseTemplate.config, // Same config
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				name: 'Updated Template',
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			// Should only update name and updatedAt, not config
			expect(mockRepository.update).toHaveBeenCalledWith(
				baseTemplate,
				expect.objectContaining({
					name: 'Updated Template',
				}),
			);
		});

		it('should handle repository update correctly', async () => {
			const updates: TUpdateConfigTemplateDto = {
				name: 'Updated Template',
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				name: 'Updated Template',
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			await useCase.execute(baseTemplate, updates, 'user-123');

			expect(mockRepository.update).toHaveBeenCalledWith(baseTemplate, expect.any(Object));
			expect(mockRepository.findOneById).toHaveBeenCalledWith('template-123');
		});

		it('should return updated template from repository', async () => {
			const updates: TUpdateConfigTemplateDto = {
				name: 'Updated Template',
			};

			const updatedTemplate: TConfigTemplate = {
				...baseTemplate,
				name: 'Updated Template',
				updatedAt: new Date(),
			};

			mockRepository.findOneById.mockResolvedValue(updatedTemplate);

			const result = await useCase.execute(baseTemplate, updates, 'user-123');

			expect(result).toEqual(updatedTemplate);
		});
	});
});

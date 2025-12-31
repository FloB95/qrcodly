import 'reflect-metadata';
import { DeleteConfigTemplateUseCase } from '../delete-config-template.use-case';
import type ConfigTemplateRepository from '../../domain/repository/config-template.repository';
import { type Logger } from '@/core/logging';
import { type EventEmitter } from '@/core/event';
import { type ImageService } from '@/core/services/image.service';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults } from '@shared/schemas';
import { type TConfigTemplate } from '../../domain/entities/config-template.entity';
import { ConfigTemplateDeletedEvent } from '../../event/config-template-deleted.event';

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(true).toBe(true);
	});
});

describe('DeleteConfigTemplateUseCase', () => {
	let useCase: DeleteConfigTemplateUseCase;
	let mockRepository: MockProxy<ConfigTemplateRepository>;
	let mockLogger: MockProxy<Logger>;
	let mockEventEmitter: MockProxy<EventEmitter>;
	let mockImageService: MockProxy<ImageService>;

	const mockTemplate: TConfigTemplate = {
		id: 'template-123',
		name: 'Test Template',
		config: {
			...QrCodeDefaults,
			image: 'https://cdn.example.com/config-image.png',
		},
		previewImage: 'https://cdn.example.com/preview.png',
		createdBy: 'user-123',
		isPredefined: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		mockRepository = mock<ConfigTemplateRepository>();
		mockLogger = mock<Logger>();
		mockEventEmitter = mock<EventEmitter>();
		mockImageService = mock<ImageService>();

		useCase = new DeleteConfigTemplateUseCase(
			mockRepository,
			mockLogger,
			mockEventEmitter,
			mockImageService,
		);

		mockRepository.delete.mockResolvedValue(true);
		mockImageService.deleteImage.mockResolvedValue();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should delete config image before deleting template', async () => {
			await useCase.execute(mockTemplate, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(
				'https://cdn.example.com/config-image.png',
			);
		});

		it('should delete preview image before deleting template', async () => {
			await useCase.execute(mockTemplate, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(
				'https://cdn.example.com/preview.png',
			);
		});

		it('should handle null previewImage gracefully', async () => {
			const templateWithoutPreview = {
				...mockTemplate,
				previewImage: null,
			};

			await useCase.execute(templateWithoutPreview, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(undefined);
		});

		it('should handle null config image gracefully', async () => {
			const templateWithoutConfigImage = {
				...mockTemplate,
				config: {
					...QrCodeDefaults,
					image: null,
				},
			};

			// @ts-expect-error to test null behavior
			await useCase.execute(templateWithoutConfigImage, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(null);
		});

		it('should call repository.delete() with template', async () => {
			await useCase.execute(mockTemplate, 'user-123');

			expect(mockRepository.delete).toHaveBeenCalledWith(mockTemplate);
		});

		it('should return true when deletion succeeds', async () => {
			mockRepository.delete.mockResolvedValue(true);

			const result = await useCase.execute(mockTemplate, 'user-123');

			expect(result).toBe(true);
		});

		it('should return false when deletion fails', async () => {
			mockRepository.delete.mockResolvedValue(false);

			const result = await useCase.execute(mockTemplate, 'user-123');

			expect(result).toBe(false);
		});

		it('should emit ConfigTemplateDeletedEvent when deletion succeeds', async () => {
			await useCase.execute(mockTemplate, 'user-123');

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(expect.any(ConfigTemplateDeletedEvent));
		});

		it('should not emit event when deletion fails', async () => {
			mockRepository.delete.mockResolvedValue(false);

			await useCase.execute(mockTemplate, 'user-123');

			expect(mockEventEmitter.emit).not.toHaveBeenCalled();
		});

		it('should log successful deletion', async () => {
			await useCase.execute(mockTemplate, 'user-123');

			expect(mockLogger.info).toHaveBeenCalledWith('Config template deleted successfully', {
				id: 'template-123',
				deletedBy: 'user-123',
			});
		});

		it('should log warning when deletion fails', async () => {
			mockRepository.delete.mockResolvedValue(false);

			await useCase.execute(mockTemplate, 'user-123');

			expect(mockLogger.warn).toHaveBeenCalledWith('Failed to delete config template', {
				id: 'template-123',
			});
		});

		it('should delete images before repository delete', async () => {
			const deleteOrder: string[] = [];

			mockImageService.deleteImage.mockImplementation(async () => {
				deleteOrder.push('image');
			});

			mockRepository.delete.mockImplementation(async () => {
				deleteOrder.push('template');
				return true;
			});

			await useCase.execute(mockTemplate, 'user-123');

			expect(deleteOrder[0]).toBe('image');
			expect(deleteOrder[1]).toBe('image');
			expect(deleteOrder[2]).toBe('template');
		});
	});
});

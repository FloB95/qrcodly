import 'reflect-metadata';
import { CreateConfigTemplateUseCase } from '../create-config-template.use-case';
import type ConfigTemplateRepository from '../../domain/repository/config-template.repository';
import { type Logger } from '@/core/logging';
import { type EventEmitter } from '@/core/event';
import { type ImageService } from '@/core/services/image.service';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults, type TCreateConfigTemplateDto } from '@shared/schemas';
import { type TConfigTemplate } from '../../domain/entities/config-template.entity';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { ConfigTemplateCreatedEvent } from '../../event/config-template-created.event';

// Mock UnitOfWork
jest.mock('@/core/db/unit-of-work');

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(true).toBe(true);
	});
});

describe('CreateConfigTemplateUseCase', () => {
	let useCase: CreateConfigTemplateUseCase;
	let mockRepository: MockProxy<ConfigTemplateRepository>;
	let mockLogger: MockProxy<Logger>;
	let mockEventEmitter: MockProxy<EventEmitter>;
	let mockImageService: MockProxy<ImageService>;

	const mockDto: TCreateConfigTemplateDto = {
		name: 'Test Template',
		config: QrCodeDefaults,
	};

	const mockCreatedTemplate: TConfigTemplate = {
		id: 'template-123',
		name: 'Test Template',
		config: QrCodeDefaults,
		createdBy: 'user-123',
		previewImage: null,
		isPredefined: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		mockRepository = mock<ConfigTemplateRepository>();
		mockLogger = mock<Logger>();
		mockEventEmitter = mock<EventEmitter>();
		mockImageService = mock<ImageService>();

		useCase = new CreateConfigTemplateUseCase(
			mockRepository,
			mockLogger,
			mockEventEmitter,
			mockImageService,
		);

		// Mock UnitOfWork

		(UnitOfWork.run as jest.Mock).mockImplementation(async (callback: any) => callback());

		// Default mocks
		mockRepository.generateId.mockResolvedValue('template-123');
		mockRepository.create.mockResolvedValue();
		mockRepository.findOneById.mockResolvedValue(mockCreatedTemplate);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should create config template successfully', async () => {
			const result = await useCase.execute(mockDto, 'user-123');

			expect(result).toEqual(mockCreatedTemplate);
			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'template-123',
					name: 'Test Template',
					createdBy: 'user-123',
					isPredefined: false,
					previewImage: null,
				}),
			);
		});

		it('should wrap creation in UnitOfWork transaction', async () => {
			await useCase.execute(mockDto, 'user-123');

			expect(UnitOfWork.run).toHaveBeenCalledTimes(1);
		});

		it('should upload image when provided in config', async () => {
			const dtoWithImage: TCreateConfigTemplateDto = {
				...mockDto,
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,abc123',
				},
			};

			mockImageService.uploadImage.mockResolvedValue('https://cdn.example.com/image.png');

			await useCase.execute(dtoWithImage, 'user-123');

			expect(mockImageService.uploadImage).toHaveBeenCalledWith(
				'data:image/png;base64,abc123',
				'template-123',
				'user-123',
			);
			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					config: expect.objectContaining({
						image: 'https://cdn.example.com/image.png',
					}),
				}),
			);
		});

		it('should not upload image when not provided', async () => {
			await useCase.execute(mockDto, 'user-123');

			expect(mockImageService.uploadImage).not.toHaveBeenCalled();
		});

		it('should emit ConfigTemplateCreatedEvent', async () => {
			await useCase.execute(mockDto, 'user-123');

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(expect.any(ConfigTemplateCreatedEvent));
		});

		it('should log successful creation', async () => {
			await useCase.execute(mockDto, 'user-123');

			expect(mockLogger.info).toHaveBeenCalledWith('Config Template created successfully', {
				id: 'template-123',
				createdBy: 'user-123',
			});
		});

		it('should delete uploaded image if transaction fails', async () => {
			const dtoWithImage: TCreateConfigTemplateDto = {
				...mockDto,
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,abc123',
				},
			};

			mockImageService.uploadImage.mockResolvedValue('https://cdn.example.com/image.png');
			mockRepository.create.mockRejectedValue(new Error('DB error'));

			await expect(useCase.execute(dtoWithImage, 'user-123')).rejects.toThrow();

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(
				'https://cdn.example.com/image.png',
			);
		});

		it('should throw error when repository create fails', async () => {
			mockRepository.create.mockRejectedValue(new Error('Generic error'));

			await expect(useCase.execute(mockDto, 'user-123')).rejects.toThrow();
		});

		it('should throw error when created template cannot be retrieved', async () => {
			// @ts-ignore expecting this to test null behavior
			mockRepository.findOneById.mockResolvedValue(null);

			await expect(useCase.execute(mockDto, 'user-123')).rejects.toThrow(
				'Failed to retrieve Config Template',
			);
		});

		it('should set isPredefined to false', async () => {
			await useCase.execute(mockDto, 'user-123');

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					isPredefined: false,
				}),
			);
		});

		it('should set previewImage to null', async () => {
			await useCase.execute(mockDto, 'user-123');

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					previewImage: null,
				}),
			);
		});
	});
});

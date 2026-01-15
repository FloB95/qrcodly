import 'reflect-metadata';
import { GetConfigTemplateUseCase } from '../get-config-template.use-case';
import type ConfigTemplateRepository from '../../domain/repository/config-template.repository';
import { type ImageService } from '@/core/services/image.service';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults } from '@shared/schemas';
import { type TConfigTemplate } from '../../domain/entities/config-template.entity';

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(true).toBe(true);
	});
});

describe('GetConfigTemplateUseCase', () => {
	let useCase: GetConfigTemplateUseCase;
	let mockRepository: MockProxy<ConfigTemplateRepository>;
	let mockImageService: MockProxy<ImageService>;

	const mockTemplate: TConfigTemplate = {
		id: 'template-123',
		name: 'Test Template',
		config: {
			...QrCodeDefaults,
			image: 's3://bucket/config-image.png',
		},
		previewImage: 's3://bucket/preview.png',
		createdBy: 'user-123',
		isPredefined: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		mockRepository = mock<ConfigTemplateRepository>();
		mockImageService = mock<ImageService>();

		useCase = new GetConfigTemplateUseCase(mockRepository, mockImageService);

		// Return fresh copies to avoid mutation issues
		mockRepository.findOneById.mockImplementation(async () =>
			JSON.parse(JSON.stringify(mockTemplate)),
		);
		mockImageService.getSignedUrl.mockImplementation(async (path) => {
			if (!path) return undefined;
			// Extract filename from s3:// path
			const filename = path.replace('s3://bucket/', '');
			return `https://cdn.example.com/${filename}`;
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should retrieve config template by ID', async () => {
			const result = await useCase.execute('template-123');

			// Dates are serialized due to JSON.parse(JSON.stringify())
			const expected = JSON.parse(JSON.stringify(mockTemplate));
			expect(result).toEqual(expected);
			expect(mockRepository.findOneById).toHaveBeenCalledWith('template-123');
		});

		it('should return null when template not found', async () => {
			// @ts-ignore expecting this to test null behavior
			mockRepository.findOneById.mockResolvedValue(null);

			const result = await useCase.execute('non-existent');

			expect(result).toBeNull();
		});

		it('should convert config image to signed URL when convertImagePathToUrl is true', async () => {
			const result = await useCase.execute('template-123', true);

			expect(mockImageService.getSignedUrl).toHaveBeenCalledWith('s3://bucket/config-image.png');
			expect(result?.config.image).toContain('https://cdn.example.com/');
		});

		it('should convert preview image to signed URL when convertImagePathToUrl is true', async () => {
			const result = await useCase.execute('template-123', true);

			expect(mockImageService.getSignedUrl).toHaveBeenCalledWith('s3://bucket/preview.png');
			expect(result?.previewImage).toContain('https://cdn.example.com/');
		});

		it('should not convert images when convertImagePathToUrl is false', async () => {
			const result = await useCase.execute('template-123', false);

			expect(mockImageService.getSignedUrl).not.toHaveBeenCalled();
			expect(result?.config.image).toBe('s3://bucket/config-image.png');
			expect(result?.previewImage).toBe('s3://bucket/preview.png');
		});

		it('should not convert images when convertImagePathToUrl is not provided', async () => {
			const result = await useCase.execute('template-123');

			expect(mockImageService.getSignedUrl).not.toHaveBeenCalled();
			expect(result?.config.image).toBe('s3://bucket/config-image.png');
		});

		it('should handle null config image gracefully', async () => {
			const templateWithoutConfigImage: TConfigTemplate = {
				...mockTemplate,
				config: {
					...QrCodeDefaults,
					// @ts-ignore expecting this to test null behavior
					image: null,
				},
			};

			mockRepository.findOneById.mockResolvedValue(templateWithoutConfigImage);

			const result = await useCase.execute('template-123', true);

			expect(result?.config.image).toBeNull();
		});

		it('should handle null preview image gracefully', async () => {
			const templateWithoutPreview: TConfigTemplate = {
				...mockTemplate,
				previewImage: null,
			};

			mockRepository.findOneById.mockResolvedValue(templateWithoutPreview);

			const result = await useCase.execute('template-123', true);

			expect(result?.previewImage).toBeNull();
		});

		it('should return null preview when signed URL is null', async () => {
			// @ts-ignore expecting this to test null behavior
			mockImageService.getSignedUrl.mockResolvedValue(null);

			const result = await useCase.execute('template-123', true);

			expect(result?.previewImage).toBeNull();
		});
	});
});

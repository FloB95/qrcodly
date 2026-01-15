import 'reflect-metadata';
import { ListConfigTemplatesUseCase } from '../list-config-templates.use-case';
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

describe('ListConfigTemplatesUseCase', () => {
	let useCase: ListConfigTemplatesUseCase;
	let mockRepository: MockProxy<ConfigTemplateRepository>;
	let mockImageService: MockProxy<ImageService>;

	const mockTemplates: TConfigTemplate[] = [
		{
			id: 'template-1',
			name: 'Template 1',
			config: {
				...QrCodeDefaults,
				image: 's3://bucket/image1.png',
			},
			previewImage: 's3://bucket/preview1.png',
			createdBy: 'user-123',
			isPredefined: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			id: 'template-2',
			name: 'Template 2',
			config: QrCodeDefaults,
			previewImage: null,
			createdBy: 'user-123',
			isPredefined: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	];

	beforeEach(() => {
		mockRepository = mock<ConfigTemplateRepository>();
		mockImageService = mock<ImageService>();

		useCase = new ListConfigTemplatesUseCase(mockRepository, mockImageService);

		// Default mock implementations
		// Return fresh copies to avoid mutation issues
		mockRepository.findAll.mockImplementation(async () =>
			JSON.parse(JSON.stringify(mockTemplates)),
		);
		mockRepository.countTotal.mockResolvedValue(2);
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
		it('should query repository with correct parameters', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
				where: {
					createdBy: { eq: 'user-123' },
				},
			});

			expect(mockRepository.findAll).toHaveBeenCalledWith({
				limit: 10,
				page: 1,
				where: {
					createdBy: { eq: 'user-123' },
				},
			});
		});

		it('should convert config image paths to signed URLs', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(mockImageService.getSignedUrl).toHaveBeenCalledWith('s3://bucket/image1.png');
		});

		it('should convert preview image paths to signed URLs', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(mockImageService.getSignedUrl).toHaveBeenCalledWith('s3://bucket/preview1.png');
		});

		it('should not attempt to convert null preview images', async () => {
			const templatesWithoutPreview: TConfigTemplate[] = [
				{
					...mockTemplates[1],
					previewImage: null,
				},
			];

			mockRepository.findAll.mockResolvedValue(templatesWithoutPreview);

			await useCase.execute({
				limit: 10,
				page: 1,
			});

			// Should only be called for config.image, not previewImage
			expect(mockImageService.getSignedUrl).not.toHaveBeenCalledWith(null);
		});

		it('should count total config templates', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
				where: {
					createdBy: { eq: 'user-123' },
				},
			});

			expect(mockRepository.countTotal).toHaveBeenCalledWith({
				createdBy: { eq: 'user-123' },
			});
		});

		it('should return config templates and total count', async () => {
			const result = await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(result).toHaveProperty('configTemplates');
			expect(result).toHaveProperty('total');
			expect(result.configTemplates).toHaveLength(2);
			expect(result.total).toBe(2);
		});

		it('should handle query without where clause', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(mockRepository.findAll).toHaveBeenCalledWith({
				limit: 10,
				page: 1,
			});
			expect(mockRepository.countTotal).toHaveBeenCalledWith(undefined);
		});

		it('should handle empty results', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockRepository.countTotal.mockResolvedValue(0);

			const result = await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(result.configTemplates).toHaveLength(0);
			expect(result.total).toBe(0);
		});

		it('should process multiple templates in parallel', async () => {
			const manyTemplates = Array.from({ length: 10 }, (_, i) => ({
				...mockTemplates[0],
				id: `template-${i}`,
			}));

			mockRepository.findAll.mockResolvedValue(manyTemplates);

			await useCase.execute({
				limit: 10,
				page: 1,
			});

			// All images should be processed
			expect(mockImageService.getSignedUrl).toHaveBeenCalledTimes(20); // 10 config images + 10 preview images
		});

		it('should convert images to signed URLs in results', async () => {
			const result = await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(result.configTemplates[0].config.image).toContain('https://cdn.example.com/');
			expect(result.configTemplates[0].previewImage).toContain('https://cdn.example.com/');
		});

		it('should handle null image gracefully', async () => {
			const templatesWithoutImage: TConfigTemplate[] = [
				{
					...mockTemplates[1],
					config: {
						...QrCodeDefaults,
						// @ts-ignore expecting this to test null behavior
						image: null,
					},
				},
			];

			mockRepository.findAll.mockResolvedValue(templatesWithoutImage);

			await useCase.execute({
				limit: 10,
				page: 1,
			});

			// Should complete without errors
			expect(mockImageService.getSignedUrl).not.toHaveBeenCalledWith(null);
		});

		it('should return null preview image when signed URL is null', async () => {
			// @ts-ignore expecting this to test null behavior
			mockImageService.getSignedUrl.mockResolvedValue(null);

			const result = await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(result.configTemplates[0].previewImage).toBeNull();
		});

		it('should filter by isPredefined', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
				where: {
					isPredefined: { eq: true },
				},
			});

			expect(mockRepository.findAll).toHaveBeenCalledWith({
				limit: 10,
				page: 1,
				where: {
					isPredefined: { eq: true },
				},
			});
		});

		it('should handle different pagination parameters', async () => {
			await useCase.execute({
				limit: 20,
				page: 2,
			});

			expect(mockRepository.findAll).toHaveBeenCalledWith({
				limit: 20,
				page: 2,
			});
		});
	});
});

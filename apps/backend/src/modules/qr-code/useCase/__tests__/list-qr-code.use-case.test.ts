import 'reflect-metadata';
import { ListQrCodesUseCase } from '../list-qr-code.use-case';
import type QrCodeRepository from '../../domain/repository/qr-code.repository';
import { type ImageService } from '@/core/services/image.service';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults } from '@shared/schemas';
import { type TQrCodeWithRelations } from '../../domain/entities/qr-code.entity';

describe('ListQrCodesUseCase', () => {
	let useCase: ListQrCodesUseCase;
	let mockRepository: MockProxy<QrCodeRepository>;
	let mockImageService: MockProxy<ImageService>;

	const mockQrCodes: TQrCodeWithRelations[] = [
		{
			id: 'qr-1',
			name: 'QR Code 1',
			content: {
				type: 'url',
				data: {
					url: 'https://example.com',
					isEditable: false,
				},
			},
			config: {
				...QrCodeDefaults,
				image: 's3://bucket/image1.png',
			},
			qrCodeData: 'https://example.com',
			previewImage: 's3://bucket/preview1.png',
			createdBy: 'user-123',
			createdAt: new Date(),
			updatedAt: new Date(),
			shortUrl: null,
			share: null,
			tags: [],
		},
		{
			id: 'qr-2',
			name: 'QR Code 2',
			content: {
				type: 'text',
				data: 'Hello World',
			},
			config: QrCodeDefaults,
			qrCodeData: 'Hello World',
			previewImage: null,
			createdBy: 'user-123',
			createdAt: new Date(),
			updatedAt: new Date(),
			shortUrl: null,
			share: null,
			tags: [],
		},
	];

	beforeEach(() => {
		mockRepository = mock<QrCodeRepository>();
		mockImageService = mock<ImageService>();

		useCase = new ListQrCodesUseCase(mockRepository, mockImageService);

		// Default mock implementations
		// Return fresh copies to avoid mutation issues
		mockRepository.findAll.mockImplementation(async () => JSON.parse(JSON.stringify(mockQrCodes)));
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
				contentType: undefined,
				tagIds: undefined,
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
			const qrCodesWithoutPreview: TQrCodeWithRelations[] = [
				{
					...mockQrCodes[1],
					previewImage: null,
				},
			];

			mockRepository.findAll.mockResolvedValue(qrCodesWithoutPreview);

			await useCase.execute({
				limit: 10,
				page: 1,
			});

			// Should only be called for config.image, not previewImage
			expect(mockImageService.getSignedUrl).not.toHaveBeenCalledWith(null);
		});

		it('should count total QR codes', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
				where: {
					createdBy: { eq: 'user-123' },
				},
			});

			expect(mockRepository.countTotal).toHaveBeenCalledWith(
				{
					createdBy: { eq: 'user-123' },
				},
				undefined,
				undefined,
			);
		});

		it('should return QR codes and total count', async () => {
			const result = await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(result).toHaveProperty('qrCodes');
			expect(result).toHaveProperty('total');
			expect(result.qrCodes).toHaveLength(2);
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
				contentType: undefined,
				tagIds: undefined,
			});
			expect(mockRepository.countTotal).toHaveBeenCalledWith(undefined, undefined, undefined);
		});

		it('should handle empty results', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockRepository.countTotal.mockResolvedValue(0);

			const result = await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(result.qrCodes).toHaveLength(0);
			expect(result.total).toBe(0);
		});

		it('should process multiple QR codes in parallel', async () => {
			const manyQrCodes = Array.from({ length: 10 }, (_, i) => ({
				...mockQrCodes[0],
				id: `qr-${i}`,
			}));

			mockRepository.findAll.mockResolvedValue(manyQrCodes);

			await useCase.execute({
				limit: 10,
				page: 1,
			});

			// All images should be processed
			expect(mockImageService.getSignedUrl).toHaveBeenCalledTimes(20); // 10 config images + 10 preview images
		});

		it('should handle null image gracefully', async () => {
			const qrCodesWithoutImage: TQrCodeWithRelations[] = [
				{
					...mockQrCodes[1],
					config: {
						...QrCodeDefaults,
						// @ts-expect-error to test null behavior
						image: null,
					},
				},
			];

			mockRepository.findAll.mockResolvedValue(qrCodesWithoutImage);

			await useCase.execute({
				limit: 10,
				page: 1,
			});

			// Should complete without errors
			expect(mockImageService.getSignedUrl).not.toHaveBeenCalledWith(null);
		});

		it('should return null preview image when signed URL is null', async () => {
			// @ts-expect-error to test null behavior
			mockImageService.getSignedUrl.mockResolvedValue(null);

			const result = await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(result.qrCodes[0].previewImage).toBeNull();
		});

		it('should pass contentType filter to repository', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
				where: {
					createdBy: { eq: 'user-123' },
				},
				contentType: ['url', 'text'],
			});

			expect(mockRepository.findAll).toHaveBeenCalledWith({
				limit: 10,
				page: 1,
				where: {
					createdBy: { eq: 'user-123' },
				},
				contentType: ['url', 'text'],
				tagIds: undefined,
			});

			expect(mockRepository.countTotal).toHaveBeenCalledWith(
				{
					createdBy: { eq: 'user-123' },
				},
				['url', 'text'],
				undefined,
			);
		});
	});
});

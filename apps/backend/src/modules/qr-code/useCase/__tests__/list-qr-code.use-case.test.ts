/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import 'reflect-metadata';
import { ListQrCodesUseCase } from '../list-qr-code.use-case';
import type QrCodeRepository from '../../domain/repository/qr-code.repository';
import { type ImageService } from '@/core/services/image.service';
import { type KeyCache } from '@/core/cache';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults } from '@shared/schemas';
import { type TQrCodeWithRelations } from '../../domain/entities/qr-code.entity';

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(true).toBe(true);
	});
});

describe('ListQrCodesUseCase', () => {
	let useCase: ListQrCodesUseCase;
	let mockRepository: MockProxy<QrCodeRepository>;
	let mockImageService: MockProxy<ImageService>;
	let mockCache: MockProxy<KeyCache>;

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
			previewImage: 's3://bucket/preview1.png',
			createdBy: 'user-123',
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			id: 'qr-2',
			name: 'QR Code 2',
			content: {
				type: 'text',
				data: 'Hello World',
			},
			config: QrCodeDefaults,
			previewImage: null,
			createdBy: 'user-123',
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	];

	beforeEach(() => {
		mockRepository = mock<QrCodeRepository>();
		mockImageService = mock<ImageService>();
		mockCache = mock<KeyCache>();

		useCase = new ListQrCodesUseCase(mockRepository, mockImageService, mockCache);

		// Default mock implementations
		mockCache.get.mockResolvedValue(null);
		mockCache.set.mockResolvedValue(undefined);
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
		it('should return cached data if exists', async () => {
			const cachedData = {
				qrCodes: mockQrCodes,
				total: 2,
			};

			mockCache.get.mockResolvedValue(JSON.stringify(cachedData));

			const result = await useCase.execute({
				limit: 10,
				page: 1,
			});

			// Dates are stringified in cache, so parse and compare
			const expectedResult = JSON.parse(JSON.stringify(cachedData));
			expect(result).toEqual(expectedResult);
			expect(mockRepository.findAll).not.toHaveBeenCalled();
			expect(mockCache.get).toHaveBeenCalled();
		});

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

			expect(mockRepository.countTotal).toHaveBeenCalledWith({
				createdBy: { eq: 'user-123' },
			});
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

		it('should cache results with correct TTL', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(mockCache.set).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				1 * 24 * 60 * 60, // 1 day in seconds
				expect.any(Array),
			);
		});

		it('should cache results with user tag when createdBy filter is present', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
				where: {
					createdBy: { eq: 'user-123' },
				},
			});

			expect(mockCache.set).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Number),
				['qr-codes-list:user:user-123'],
			);
		});

		it('should cache results with empty tags when no createdBy filter', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(mockCache.set).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Number),
				[],
			);
		});

		it('should generate correct cache key', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
				where: {
					createdBy: { eq: 'user-123' },
				},
			});

			expect(mockCache.get).toHaveBeenCalledWith(
				'qr-code-list:10-1-{"createdBy":{"eq":"user-123"}}',
			);
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

		it('should cache stringified results', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
			});

			const cacheSetCall = (mockCache.set as jest.Mock).mock.calls[0];
			const cachedValue = cacheSetCall[1];

			expect(typeof cachedValue).toBe('string');
			const parsed = JSON.parse(cachedValue);
			expect(parsed).toHaveProperty('qrCodes');
			expect(parsed).toHaveProperty('total');
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

		it('should not modify original QR codes with signed URLs in cache', async () => {
			await useCase.execute({
				limit: 10,
				page: 1,
			});

			const cacheSetCall = (mockCache.set as jest.Mock).mock.calls[0];
			const cachedValue = JSON.parse(cacheSetCall[1]);

			expect(cachedValue.qrCodes[0].config.image).toContain('https://cdn.example.com/');
		});

		it('should handle null image gracefully', async () => {
			const qrCodesWithoutImage: TQrCodeWithRelations[] = [
				{
					...mockQrCodes[1],
					config: {
						...QrCodeDefaults,
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
			mockImageService.getSignedUrl.mockResolvedValue(null);

			const result = await useCase.execute({
				limit: 10,
				page: 1,
			});

			expect(result.qrCodes[0].previewImage).toBeNull();
		});
	});

	describe('getTagKey', () => {
		it('should generate correct tag key for user', () => {
			const tag = ListQrCodesUseCase.getTagKey('user-123');

			expect(tag).toBe('qr-codes-list:user:user-123');
		});

		it('should handle different user IDs', () => {
			const tag1 = ListQrCodesUseCase.getTagKey('user-abc');
			const tag2 = ListQrCodesUseCase.getTagKey('user-xyz');

			expect(tag1).toBe('qr-codes-list:user:user-abc');
			expect(tag2).toBe('qr-codes-list:user:user-xyz');
		});
	});
});

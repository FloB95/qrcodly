import { DeleteQrCodeUseCase } from '../delete-qr-code.use-case';
import type QrCodeRepository from '../../domain/repository/qr-code.repository';
import type ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import type { Logger } from '@/core/logging';
import type { ImageService } from '@/core/services/image.service';
import type { EventEmitter } from '@/core/event';
import { mock } from 'jest-mock-extended';
import type { TQrCode } from '../../domain/entities/qr-code.entity';
import { QrCodeDefaults } from '@shared/schemas';

describe('DeleteQrCodeUseCase', () => {
	let useCase: DeleteQrCodeUseCase;
	let mockRepository: jest.Mocked<QrCodeRepository>;
	let mockShortUrlRepository: jest.Mocked<ShortUrlRepository>;
	let mockLogger: jest.Mocked<Logger>;
	let mockImageService: jest.Mocked<ImageService>;
	let mockEventEmitter: jest.Mocked<EventEmitter>;

	beforeEach(() => {
		mockRepository = mock<QrCodeRepository>();
		mockShortUrlRepository = mock<ShortUrlRepository>();
		mockLogger = mock<Logger>();
		mockImageService = mock<ImageService>();
		mockEventEmitter = mock<EventEmitter>();
		useCase = new DeleteQrCodeUseCase(
			mockRepository,
			mockShortUrlRepository,
			mockLogger,
			mockImageService,
			mockEventEmitter,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		const mockUserId = 'user_123';
		const mockQrCode: TQrCode = {
			id: 'qr_code_123',
			name: 'Test QR Code',
			content: {
				type: 'url',
				data: {
					url: 'https://example.com',
					isEditable: false,
				},
			},
			config: {
				...QrCodeDefaults,
				image: 'https://example.com/image.png',
			},
			qrCodeData: 'https://example.com',
			previewImage: 'https://example.com/preview.png',
			createdBy: mockUserId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		it('should delete config.image before deleting QR code', async () => {
			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(true);

			await useCase.execute(mockQrCode, mockUserId);

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(mockQrCode.config.image);
		});

		it('should delete previewImage before deleting QR code', async () => {
			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(true);

			await useCase.execute(mockQrCode, mockUserId);

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(mockQrCode.previewImage);
		});

		it('should handle null previewImage gracefully', async () => {
			const qrCodeWithoutPreview: TQrCode = {
				...mockQrCode,
				previewImage: null,
			};

			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(true);

			await useCase.execute(qrCodeWithoutPreview, mockUserId);

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(undefined);
		});

		it('should handle null config.image gracefully', async () => {
			const qrCodeWithoutImage: TQrCode = {
				...mockQrCode,
				config: {
					...mockQrCode.config,
					image: undefined,
				},
			};

			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(true);

			await useCase.execute(qrCodeWithoutImage, mockUserId);

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(undefined);
		});

		it('should call repository.delete() with QR code entity', async () => {
			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(true);

			await useCase.execute(mockQrCode, mockUserId);

			expect(mockRepository.delete).toHaveBeenCalledWith(mockQrCode);
		});

		it('should return true when deletion succeeds', async () => {
			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(true);

			const result = await useCase.execute(mockQrCode, mockUserId);

			expect(result).toBe(true);
		});

		it('should return false when deletion fails', async () => {
			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(false);

			const result = await useCase.execute(mockQrCode, mockUserId);

			expect(result).toBe(false);
		});

		it('should emit QrCodeDeletedEvent after successful deletion', async () => {
			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(true);

			await useCase.execute(mockQrCode, mockUserId);

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					qrCode: mockQrCode,
				}),
			);
		});

		it('should not emit event when deletion fails', async () => {
			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(false);

			await useCase.execute(mockQrCode, mockUserId);

			expect(mockEventEmitter.emit).not.toHaveBeenCalled();
		});

		it('should log successful deletion with id and deletedBy', async () => {
			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(true);

			await useCase.execute(mockQrCode, mockUserId);

			expect(mockLogger.info).toHaveBeenCalledWith('qrCode.deleted', {
				qrCode: {
					id: mockQrCode.id,
					deletedBy: mockUserId,
				},
			});
		});

		it('should log warning when deletion fails', async () => {
			mockImageService.deleteImage.mockResolvedValue();
			mockRepository.delete.mockResolvedValue(false);

			await useCase.execute(mockQrCode, mockUserId);

			expect(mockLogger.error).toHaveBeenCalledWith('error.qrCode.delete', {
				qrCode: {
					id: mockQrCode.id,
					deletedBy: mockUserId,
				},
			});
		});

		it('should delete images before repository delete', async () => {
			const callOrder: string[] = [];

			// @ts-expect-error
			mockImageService.deleteImage.mockImplementation(() => {
				callOrder.push('deleteImage');
			});
			mockRepository.delete.mockImplementation(() => {
				callOrder.push('repositoryDelete');
				return Promise.resolve(true);
			});

			await useCase.execute(mockQrCode, mockUserId);

			expect(callOrder[0]).toBe('deleteImage');
			expect(callOrder[1]).toBe('deleteImage');
			expect(callOrder[2]).toBe('repositoryDelete');
		});
	});
});

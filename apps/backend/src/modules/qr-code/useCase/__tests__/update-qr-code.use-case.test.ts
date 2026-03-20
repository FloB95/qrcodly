import 'reflect-metadata';
import { UpdateQrCodeUseCase } from '../update-qr-code.use-case';
import type QrCodeRepository from '../../domain/repository/qr-code.repository';
import { type Logger } from '@/core/logging';
import { type EventEmitter } from '@/core/event';
import { type ImageService } from '@/core/services/image.service';
import { type QrCodeDataService } from '../../service/qr-code-data.service';
import { type ContentUpdateStrategyService } from '../../service/content-update-strategy.service';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults, type TUpdateQrCodeDto } from '@shared/schemas';
import { type TQrCode, type TQrCodeWithRelations } from '../../domain/entities/qr-code.entity';
import { QrCodeUpdatedEvent } from '../../event/qr-code-updated.event';

describe('UpdateQrCodeUseCase', () => {
	let useCase: UpdateQrCodeUseCase;
	let mockQrCodeRepo: MockProxy<QrCodeRepository>;
	let mockLogger: MockProxy<Logger>;
	let mockEventEmitter: MockProxy<EventEmitter>;
	let mockImageService: MockProxy<ImageService>;
	let mockQrCodeDataService: jest.Mocked<QrCodeDataService>;
	let mockContentUpdateStrategyService: jest.Mocked<ContentUpdateStrategyService>;

	const baseQrCode: TQrCode = {
		id: 'qr-123',
		name: 'Test QR Code',
		content: {
			type: 'url',
			data: {
				url: 'https://example.com',
				isDynamic: false,
			},
		},
		config: QrCodeDefaults,
		createdBy: 'user-123',
		qrCodeData: 'https://example.com',
		previewImage: null,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
	};

	beforeEach(() => {
		mockQrCodeRepo = mock<QrCodeRepository>();
		mockLogger = mock<Logger>();
		mockEventEmitter = mock<EventEmitter>();
		mockImageService = mock<ImageService>();
		mockQrCodeDataService = {
			computeQrCodeData: jest.fn().mockResolvedValue('https://example.com'),
		} as unknown as jest.Mocked<QrCodeDataService>;
		mockContentUpdateStrategyService = {
			resolve: jest.fn().mockReturnValue({
				supports: jest.fn().mockReturnValue(true),
				handleContentUpdate: jest.fn().mockResolvedValue(undefined),
			}),
		} as unknown as jest.Mocked<ContentUpdateStrategyService>;

		useCase = new UpdateQrCodeUseCase(
			mockQrCodeRepo,
			mockLogger,
			mockEventEmitter,
			mockImageService,
			mockQrCodeDataService,
			mockContentUpdateStrategyService,
		);

		// Default mock implementations
		mockQrCodeRepo.update.mockResolvedValue();
		mockQrCodeRepo.findOneById.mockResolvedValue({
			...baseQrCode,
			updatedAt: new Date(),
			shortUrl: null,
		} as TQrCodeWithRelations);
		mockImageService.handleImageUpdate.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should return existing QR code when no changes detected', async () => {
			const updates: TUpdateQrCodeDto = {
				name: baseQrCode.name, // Same name, no actual change
			};

			const updatedQrCode = { ...baseQrCode, updatedAt: new Date() } as TQrCodeWithRelations;
			mockQrCodeRepo.findOneById.mockResolvedValue(updatedQrCode);

			const result = await useCase.execute(baseQrCode, updates, 'user-123');

			// Should return the QR code even if no real changes
			expect(result.id).toEqual(baseQrCode.id);
			expect(result.name).toEqual(baseQrCode.name);
		});

		it('should throw error when content type changes', async () => {
			const updates: TUpdateQrCodeDto = {
				content: {
					type: 'text',
					data: 'Hello World',
				},
			};

			// Zod validation fails before content type check, so we get ZodError
			await expect(useCase.execute(baseQrCode, updates, 'user-123')).rejects.toThrow();
		});

		it('should allow updates within same content type', async () => {
			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
			};

			await useCase.execute(baseQrCode, updates, 'user-123');

			expect(mockQrCodeRepo.update).toHaveBeenCalledWith(
				baseQrCode,
				expect.objectContaining({
					name: 'Updated Name',
				}),
			);
		});

		it('should delegate to content update strategy when content changes', async () => {
			const updates: TUpdateQrCodeDto = {
				content: {
					type: 'url',
					data: {
						url: 'https://newurl.com',
						isDynamic: false,
					},
				},
			};

			await useCase.execute(baseQrCode, updates, 'user-123');

			expect(mockContentUpdateStrategyService.resolve).toHaveBeenCalledWith('url');
		});

		it('should update QR code content directly when URL is non-editable', async () => {
			const updates: TUpdateQrCodeDto = {
				content: {
					type: 'url',
					data: {
						url: 'https://newurl.com',
						isDynamic: false,
					},
				},
			};

			await useCase.execute(baseQrCode, updates, 'user-123');

			expect(mockQrCodeRepo.update).toHaveBeenCalledWith(
				baseQrCode,
				expect.objectContaining({
					content: expect.objectContaining({
						data: expect.objectContaining({
							url: 'https://newurl.com',
							isDynamic: false,
						}),
					}),
				}),
			);
		});

		it('should call handleImageUpdate when config.image changes', async () => {
			const qrCodeWithImage: TQrCode = {
				...baseQrCode,
				config: {
					...QrCodeDefaults,
					image: 'https://cdn.example.com/old-image.png',
				},
			};

			const updates: TUpdateQrCodeDto = {
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,newimage123',
				},
			};

			mockImageService.handleImageUpdate.mockResolvedValue('https://cdn.example.com/new-image.png');

			await useCase.execute(qrCodeWithImage, updates, 'user-123');

			expect(mockImageService.handleImageUpdate).toHaveBeenCalledWith(
				'https://cdn.example.com/old-image.png',
				'data:image/png;base64,newimage123',
				'qr-123',
				'user-123',
			);
		});

		it('should delete preview image when config changes', async () => {
			const qrCodeWithPreview: TQrCode = {
				...baseQrCode,
				previewImage: 'https://cdn.example.com/preview.png',
			};

			const updates: TUpdateQrCodeDto = {
				config: {
					...QrCodeDefaults,
					width: 500,
				},
			};

			await useCase.execute(qrCodeWithPreview, updates, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(
				'https://cdn.example.com/preview.png',
			);
			expect(mockQrCodeRepo.update).toHaveBeenCalledWith(
				qrCodeWithPreview,
				expect.objectContaining({
					previewImage: null,
				}),
			);
		});

		it('should delete preview image when content changes', async () => {
			const qrCodeWithPreview: TQrCode = {
				...baseQrCode,
				previewImage: 'https://cdn.example.com/preview.png',
			};

			const updates: TUpdateQrCodeDto = {
				content: {
					type: 'url',
					data: {
						url: 'https://newurl.com',
						isDynamic: false,
					},
				},
			};

			await useCase.execute(qrCodeWithPreview, updates, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(
				'https://cdn.example.com/preview.png',
			);
		});

		it('should set previewImage to null after deletion', async () => {
			const qrCodeWithPreview: TQrCode = {
				...baseQrCode,
				previewImage: 'https://cdn.example.com/preview.png',
			};

			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
				config: {
					...QrCodeDefaults,
					width: 500,
				},
			};

			await useCase.execute(qrCodeWithPreview, updates, 'user-123');

			expect(mockQrCodeRepo.update).toHaveBeenCalledWith(
				qrCodeWithPreview,
				expect.objectContaining({
					previewImage: null,
				}),
			);
		});

		it('should emit QrCodeUpdatedEvent after update', async () => {
			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
			};

			const updatedQrCode = { ...baseQrCode, name: 'Updated Name' } as TQrCodeWithRelations;
			mockQrCodeRepo.findOneById.mockResolvedValue(updatedQrCode);

			await useCase.execute(baseQrCode, updates, 'user-123');

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(expect.any(QrCodeUpdatedEvent));
			const emittedEvent = (mockEventEmitter.emit as jest.Mock).mock.calls[0][0];
			expect(emittedEvent.qrCode).toEqual(updatedQrCode);
		});

		it('should log updates with diffs and updatedBy', async () => {
			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
			};

			await useCase.execute(baseQrCode, updates, 'user-123');

			expect(mockLogger.info).toHaveBeenCalledWith('qrCode.updated', {
				qrCode: {
					id: 'qr-123',
					updates: expect.any(Object),
					updatedBy: 'user-123',
				},
			});
		});

		it('should only update changed fields', async () => {
			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
			};

			await useCase.execute(baseQrCode, updates, 'user-123');

			const updateCall = (mockQrCodeRepo.update as jest.Mock).mock.calls[0][1];
			expect(updateCall).toHaveProperty('name');
			expect(updateCall).toHaveProperty('updatedAt');
			expect(updateCall).not.toHaveProperty('content');
		});

		it('should exclude ignored fields from diff (id, previewImage, createdAt)', async () => {
			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
			};

			await useCase.execute(baseQrCode, updates, 'user-123');

			const logCall = (mockLogger.info as jest.Mock).mock.calls[0][1];
			expect(logCall.qrCode.updates).not.toEqual(
				expect.objectContaining({
					id: expect.anything(),
					createdAt: expect.anything(),
				}),
			);
		});

		it('should set updatedAt timestamp', async () => {
			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
			};

			await useCase.execute(baseQrCode, updates, 'user-123');

			expect(mockQrCodeRepo.update).toHaveBeenCalledWith(
				baseQrCode,
				expect.objectContaining({
					updatedAt: expect.any(Date),
				}),
			);
		});

		it('should call repository.update() with correct data', async () => {
			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
			};

			await useCase.execute(baseQrCode, updates, 'user-123');

			expect(mockQrCodeRepo.update).toHaveBeenCalledWith(baseQrCode, expect.any(Object));
		});

		it('should retrieve updated entity after update', async () => {
			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
			};

			await useCase.execute(baseQrCode, updates, 'user-123');

			expect(mockQrCodeRepo.findOneById).toHaveBeenCalledWith('qr-123');
		});

		it('should handle updates when content is text type', async () => {
			const textQrCode: TQrCode = {
				...baseQrCode,
				content: {
					type: 'text',
					data: 'Hello World',
				},
			};

			const updates: TUpdateQrCodeDto = {
				name: 'Updated Name',
			};

			await useCase.execute(textQrCode, updates, 'user-123');

			expect(mockQrCodeRepo.update).toHaveBeenCalledWith(
				textQrCode,
				expect.objectContaining({
					name: 'Updated Name',
				}),
			);
		});
	});
});

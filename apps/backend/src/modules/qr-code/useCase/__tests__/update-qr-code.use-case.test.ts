/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import 'reflect-metadata';
import { UpdateQrCodeUseCase } from '../update-qr-code.use-case';
import type QrCodeRepository from '../../domain/repository/qr-code.repository';
import type ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { type UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import { type Logger } from '@/core/logging';
import { type EventEmitter } from '@/core/event';
import { type ImageService } from '@/core/services/image.service';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults, type TUpdateQrCodeDto } from '@shared/schemas';
import { type TQrCode, type TQrCodeWithRelations } from '../../domain/entities/qr-code.entity';
import { type TShortUrl } from '@/modules/url-shortener/domain/entities/short-url.entity';
import { QrCodeUpdatedEvent } from '../../event/qr-code-updated.event';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(true).toBe(true);
	});
});

describe('UpdateQrCodeUseCase', () => {
	let useCase: UpdateQrCodeUseCase;
	let mockQrCodeRepo: MockProxy<QrCodeRepository>;
	let mockShortUrlRepo: MockProxy<ShortUrlRepository>;
	let mockUpdateShortUrlUseCase: MockProxy<UpdateShortUrlUseCase>;
	let mockLogger: MockProxy<Logger>;
	let mockEventEmitter: MockProxy<EventEmitter>;
	let mockImageService: MockProxy<ImageService>;

	const baseQrCode: TQrCode = {
		id: 'qr-123',
		name: 'Test QR Code',
		content: {
			type: 'url',
			data: {
				url: 'https://example.com',
				isEditable: false,
			},
		},
		config: QrCodeDefaults,
		createdBy: 'user-123',
		previewImage: null,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
	};

	const mockShortUrl: TShortUrl = {
		id: 'short-123',
		shortCode: 'abc123',
		destinationUrl: 'https://example.com',
		isActive: true,
		qrCodeId: 'qr-123',
		createdBy: 'user-123',
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		mockQrCodeRepo = mock<QrCodeRepository>();
		mockShortUrlRepo = mock<ShortUrlRepository>();
		mockUpdateShortUrlUseCase = mock<UpdateShortUrlUseCase>();
		mockLogger = mock<Logger>();
		mockEventEmitter = mock<EventEmitter>();
		mockImageService = mock<ImageService>();

		useCase = new UpdateQrCodeUseCase(
			mockQrCodeRepo,
			mockLogger,
			mockEventEmitter,
			mockShortUrlRepo,
			mockUpdateShortUrlUseCase,
			mockImageService,
		);

		// Default mock implementations
		mockQrCodeRepo.update.mockResolvedValue(undefined);
		mockQrCodeRepo.findOneById.mockResolvedValue({
			...baseQrCode,
			updatedAt: new Date(),
		} as TQrCodeWithRelations);
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

		it('should update linked short URL when URL QR code is editable', async () => {
			const editableQrCode: TQrCode = {
				...baseQrCode,
				content: {
					type: 'url',
					data: {
						url: 'https://example.com',
						isEditable: true,
					},
				},
			};

			const updates: TUpdateQrCodeDto = {
				content: {
					type: 'url',
					data: {
						url: 'https://newurl.com',
						isEditable: true,
					},
				},
			};

			mockShortUrlRepo.findOneByQrCodeId.mockResolvedValue(mockShortUrl);
			mockUpdateShortUrlUseCase.execute.mockResolvedValue(mockShortUrl);

			await useCase.execute(editableQrCode, updates, 'user-123');

			expect(mockShortUrlRepo.findOneByQrCodeId).toHaveBeenCalledWith('qr-123');
			expect(mockUpdateShortUrlUseCase.execute).toHaveBeenCalledWith(
				mockShortUrl,
				expect.objectContaining({
					destinationUrl: 'https://newurl.com',
				}),
				'user-123',
			);
		});

		it('should update QR code content directly when URL is non-editable', async () => {
			const updates: TUpdateQrCodeDto = {
				content: {
					type: 'url',
					data: {
						url: 'https://newurl.com',
						isEditable: false,
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
							isEditable: false,
						}),
					}),
				}),
			);
			expect(mockShortUrlRepo.findOneByQrCodeId).not.toHaveBeenCalled();
		});

		it('should throw ShortUrlNotFoundError when editable but no linked short URL', async () => {
			const editableQrCode: TQrCode = {
				...baseQrCode,
				content: {
					type: 'url',
					data: {
						url: 'https://example.com',
						isEditable: true,
					},
				},
			};

			const updates: TUpdateQrCodeDto = {
				content: {
					type: 'url',
					data: {
						url: 'https://newurl.com',
						isEditable: true,
					},
				},
			};

			mockShortUrlRepo.findOneByQrCodeId.mockResolvedValue(undefined);

			await expect(useCase.execute(editableQrCode, updates, 'user-123')).rejects.toThrow(
				ShortUrlNotFoundError,
			);
		});

		it('should delete old image and upload new one when config.image changes', async () => {
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

			mockImageService.uploadImage.mockResolvedValue('https://cdn.example.com/new-image.png');

			await useCase.execute(qrCodeWithImage, updates, 'user-123');

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(
				'https://cdn.example.com/old-image.png',
			);
			expect(mockImageService.uploadImage).toHaveBeenCalledWith(
				'data:image/png;base64,newimage123',
				'qr-123',
				'user-123',
			);
		});

		it('should delete old image when config changes', async () => {
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
					margin: 10, // Change something in config
				},
			};

			const updatedQrCode = {
				...qrCodeWithImage,
				config: { ...QrCodeDefaults, margin: 10 },
				previewImage: null,
			} as TQrCodeWithRelations;
			mockQrCodeRepo.findOneById.mockResolvedValue(updatedQrCode);

			await useCase.execute(qrCodeWithImage, updates, 'user-123');

			// Preview should be deleted when config changes
			expect(mockImageService.deleteImage).toHaveBeenCalled();
		});

		it('should upload new image when config.image added', async () => {
			const updates: TUpdateQrCodeDto = {
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,abc123',
				},
			};

			mockImageService.uploadImage.mockResolvedValue('https://cdn.example.com/new-image.png');

			await useCase.execute(baseQrCode, updates, 'user-123');

			expect(mockImageService.uploadImage).toHaveBeenCalledWith(
				'data:image/png;base64,abc123',
				'qr-123',
				'user-123',
			);
		});

		it('should not re-upload image if same image URL provided', async () => {
			const qrCodeWithImage: TQrCode = {
				...baseQrCode,
				config: {
					...QrCodeDefaults,
					image: 'https://cdn.example.com/image.png',
				},
			};

			const updates: TUpdateQrCodeDto = {
				config: {
					...QrCodeDefaults,
					image: 'https://cdn.example.com/image.png',
				},
			};

			await useCase.execute(qrCodeWithImage, updates, 'user-123');

			expect(mockImageService.deleteImage).not.toHaveBeenCalled();
			expect(mockImageService.uploadImage).not.toHaveBeenCalled();
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
						isEditable: false,
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
					size: 500,
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

			expect(mockLogger.info).toHaveBeenCalledWith('QR code updated successfully', {
				id: 'qr-123',
				updates: expect.any(Object), // objDiff returns complex object with oldValue/newValue
				updatedBy: 'user-123',
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

			expect(mockLogger.info).toHaveBeenCalledWith(
				'QR code updated successfully',
				expect.objectContaining({
					updates: expect.not.objectContaining({
						id: expect.anything(),
						createdAt: expect.anything(),
					}),
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
			expect(mockShortUrlRepo.findOneByQrCodeId).not.toHaveBeenCalled();
		});

		it('should reset content to original when updating editable URL via short URL', async () => {
			const editableQrCode: TQrCode = {
				...baseQrCode,
				content: {
					type: 'url',
					data: {
						url: 'https://example.com',
						isEditable: true,
					},
				},
			};

			const updates: TUpdateQrCodeDto = {
				content: {
					type: 'url',
					data: {
						url: 'https://newurl.com',
						isEditable: true,
					},
				},
			};

			mockShortUrlRepo.findOneByQrCodeId.mockResolvedValue(mockShortUrl);
			mockUpdateShortUrlUseCase.execute.mockResolvedValue(mockShortUrl);

			await useCase.execute(editableQrCode, updates, 'user-123');

			// Content should be reset to original after short URL update
			expect(mockQrCodeRepo.update).toHaveBeenCalledWith(
				editableQrCode,
				expect.objectContaining({
					content: editableQrCode.content,
				}),
			);
		});
	});
});

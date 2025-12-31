/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import 'reflect-metadata';
import { CreateQrCodeUseCase } from '../create-qr-code.use-case';
import type QrCodeRepository from '../../domain/repository/qr-code.repository';
import { type Logger } from '@/core/logging';
import { type EventEmitter } from '@/core/event';
import { type ImageService } from '@/core/services/image.service';
import { type ShortUrlStrategyService } from '../../service/short-url-strategy.service';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults, type TCreateQrCodeDto } from '@shared/schemas';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { QrCodeCreatedEvent } from '../../event/qr-code-created.event';
import { type TQrCodeWithRelations } from '../../domain/entities/qr-code.entity';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { CreateQrCodePolicy } from '../../policies/create-qr-code.policy';
import { UnauthorizedError } from '@/core/error/http/unauthorized.error';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';

// Mock UnitOfWork
jest.mock('@/core/db/unit-of-work');

// Mock CreateQrCodePolicy
jest.mock('../../policies/create-qr-code.policy');

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(true).toBe(true);
	});
});

describe('CreateQrCodeUseCase', () => {
	let useCase: CreateQrCodeUseCase;
	let mockRepository: MockProxy<QrCodeRepository>;
	let mockLogger: MockProxy<Logger>;
	let mockEventEmitter: MockProxy<EventEmitter>;
	let mockImageService: MockProxy<ImageService>;
	let mockShortUrlStrategy: MockProxy<ShortUrlStrategyService>;
	let mockPolicy: MockProxy<CreateQrCodePolicy>;

	const mockUser: TUser = {
		id: 'user-123',
		email: 'test@example.com',
		plan: 'free',
	};

	const mockQrCodeDto: TCreateQrCodeDto = {
		name: 'Test QR Code',
		content: {
			type: 'url',
			data: {
				url: 'https://example.com',
				isEditable: false,
			},
		},
		config: QrCodeDefaults,
	};

	const mockCreatedQrCode: TQrCodeWithRelations = {
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
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		mockRepository = mock<QrCodeRepository>();
		mockLogger = mock<Logger>();
		mockEventEmitter = mock<EventEmitter>();
		mockImageService = mock<ImageService>();
		mockShortUrlStrategy = mock<ShortUrlStrategyService>();
		mockPolicy = mock<CreateQrCodePolicy>();

		useCase = new CreateQrCodeUseCase(
			mockRepository,
			mockLogger,
			mockEventEmitter,
			mockImageService,
			mockShortUrlStrategy,
		);

		// Mock UnitOfWork to execute the callback immediately
		(UnitOfWork.run as jest.Mock).mockImplementation(async (callback: any) => {
			return callback();
		});

		// Mock CreateQrCodePolicy
		(CreateQrCodePolicy as jest.Mock).mockImplementation(() => mockPolicy);
		mockPolicy.checkAccess.mockResolvedValue(undefined);
		mockPolicy.incrementUsage.mockResolvedValue(undefined);

		// Default mock implementations
		mockRepository.generateId.mockResolvedValue('qr-123');
		mockRepository.create.mockResolvedValue(undefined);
		mockRepository.findOneById.mockResolvedValue(mockCreatedQrCode);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should create QR code successfully with authenticated user', async () => {
			const result = await useCase.execute(mockQrCodeDto, mockUser);

			expect(result).toEqual(mockCreatedQrCode);
			expect(mockRepository.generateId).toHaveBeenCalledTimes(1);
			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'qr-123',
					name: 'Test QR Code',
					createdBy: 'user-123',
					previewImage: null,
				}),
			);
		});

		it('should create QR code with null createdBy for unauthenticated user', async () => {
			await useCase.execute(mockQrCodeDto, undefined);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					createdBy: null,
				}),
			);
		});

		it('should call CreateQrCodePolicy checkAccess before creation', async () => {
			await useCase.execute(mockQrCodeDto, mockUser);

			expect(CreateQrCodePolicy).toHaveBeenCalledWith(mockUser, mockQrCodeDto);
			expect(mockPolicy.checkAccess).toHaveBeenCalledTimes(1);
		});

		it('should throw PlanLimitExceededError when user exceeds plan limits', async () => {
			mockPolicy.checkAccess.mockRejectedValue(new PlanLimitExceededError('url', 5));

			await expect(useCase.execute(mockQrCodeDto, mockUser)).rejects.toThrow(
				PlanLimitExceededError,
			);
		});

		it('should throw UnauthorizedError for restricted content types without auth', async () => {
			mockPolicy.checkAccess.mockRejectedValue(new UnauthorizedError());

			await expect(useCase.execute(mockQrCodeDto, undefined)).rejects.toThrow(UnauthorizedError);
		});

		it('should upload image when config.image is provided', async () => {
			const dtoWithImage: TCreateQrCodeDto = {
				...mockQrCodeDto,
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,abc123',
				},
			};

			mockImageService.uploadImage.mockResolvedValue('https://cdn.example.com/image.png');

			await useCase.execute(dtoWithImage, mockUser);

			expect(mockImageService.uploadImage).toHaveBeenCalledWith(
				'data:image/png;base64,abc123',
				'qr-123',
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

		it('should not upload image when config.image is null', async () => {
			await useCase.execute(mockQrCodeDto, mockUser);

			expect(mockImageService.uploadImage).not.toHaveBeenCalled();
		});

		it('should call ShortUrlStrategyService for authenticated users', async () => {
			await useCase.execute(mockQrCodeDto, mockUser);

			expect(mockShortUrlStrategy.handle).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'qr-123',
					createdBy: 'user-123',
				}),
			);
		});

		it('should not call ShortUrlStrategyService for unauthenticated users', async () => {
			await useCase.execute(mockQrCodeDto, undefined);

			expect(mockShortUrlStrategy.handle).not.toHaveBeenCalled();
		});

		it('should emit QrCodeCreatedEvent after successful creation', async () => {
			await useCase.execute(mockQrCodeDto, mockUser);

			expect(mockEventEmitter.emit).toHaveBeenCalledWith(expect.any(QrCodeCreatedEvent));
			const emittedEvent = (mockEventEmitter.emit as jest.Mock).mock.calls[0][0];
			expect(emittedEvent.qrCode).toEqual(mockCreatedQrCode);
		});

		it('should log successful creation with id and createdBy', async () => {
			await useCase.execute(mockQrCodeDto, mockUser);

			expect(mockLogger.info).toHaveBeenCalledWith('QR code created successfully', {
				id: 'qr-123',
				createdBy: 'user-123',
			});
		});

		it('should increment usage counter after successful creation for authenticated users', async () => {
			await useCase.execute(mockQrCodeDto, mockUser);

			expect(mockPolicy.incrementUsage).toHaveBeenCalledTimes(1);
		});

		it('should not increment usage counter for unauthenticated users', async () => {
			await useCase.execute(mockQrCodeDto, undefined);

			expect(mockPolicy.incrementUsage).not.toHaveBeenCalled();
		});

		it('should wrap creation in UnitOfWork transaction', async () => {
			await useCase.execute(mockQrCodeDto, mockUser);

			expect(UnitOfWork.run).toHaveBeenCalledTimes(1);
			expect(UnitOfWork.run).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should throw error when created QR code cannot be retrieved', async () => {
			mockRepository.findOneById.mockResolvedValue(undefined);

			await expect(useCase.execute(mockQrCodeDto, mockUser)).rejects.toThrow(
				'QR code creation transaction failed',
			);
		});

		it('should delete uploaded image if transaction fails', async () => {
			const dtoWithImage: TCreateQrCodeDto = {
				...mockQrCodeDto,
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,abc123',
				},
			};

			mockImageService.uploadImage.mockResolvedValue('https://cdn.example.com/image.png');
			mockRepository.create.mockRejectedValue(new Error('Database error'));

			(UnitOfWork.run as jest.Mock).mockImplementation(async (callback: any) => {
				return callback();
			});

			await expect(useCase.execute(dtoWithImage, mockUser)).rejects.toThrow();

			expect(mockImageService.deleteImage).toHaveBeenCalledWith(
				'https://cdn.example.com/image.png',
			);
		});

		it('should not attempt to delete image if no image was uploaded', async () => {
			mockRepository.create.mockRejectedValue(new Error('Database error'));

			await expect(useCase.execute(mockQrCodeDto, mockUser)).rejects.toThrow();

			expect(mockImageService.deleteImage).not.toHaveBeenCalled();
		});

		it('should rethrow CustomApiError as-is', async () => {
			const customError = new PlanLimitExceededError('url', 5);
			mockPolicy.checkAccess.mockRejectedValue(customError);

			await expect(useCase.execute(mockQrCodeDto, mockUser)).rejects.toThrow(customError);
		});

		it('should wrap generic errors in UnhandledServerError', async () => {
			const genericError = new Error('Generic error');
			mockRepository.create.mockRejectedValue(genericError);

			await expect(useCase.execute(mockQrCodeDto, mockUser)).rejects.toThrow(UnhandledServerError);
			await expect(useCase.execute(mockQrCodeDto, mockUser)).rejects.toThrow(
				'QR code creation transaction failed',
			);
		});

		it('should log errors with context', async () => {
			const error = new Error('Database error');
			mockRepository.create.mockRejectedValue(error);

			await expect(useCase.execute(mockQrCodeDto, mockUser)).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledWith('Failed to create QR code within transaction', {
				error,
			});
		});

		it('should handle short URL strategy failures gracefully within transaction', async () => {
			mockShortUrlStrategy.handle.mockRejectedValue(new Error('Short URL creation failed'));

			await expect(useCase.execute(mockQrCodeDto, mockUser)).rejects.toThrow(UnhandledServerError);
		});

		it('should set previewImage to null on creation', async () => {
			await useCase.execute(mockQrCodeDto, mockUser);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					previewImage: null,
				}),
			);
		});

		it('should pass correct user id to image service for authenticated user', async () => {
			const dtoWithImage: TCreateQrCodeDto = {
				...mockQrCodeDto,
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,abc123',
				},
			};

			mockImageService.uploadImage.mockResolvedValue('https://cdn.example.com/image.png');

			await useCase.execute(dtoWithImage, mockUser);

			expect(mockImageService.uploadImage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				'user-123',
			);
		});

		it('should pass undefined user id to image service for unauthenticated user', async () => {
			const dtoWithImage: TCreateQrCodeDto = {
				...mockQrCodeDto,
				config: {
					...QrCodeDefaults,
					image: 'data:image/png;base64,abc123',
				},
			};

			mockImageService.uploadImage.mockResolvedValue('https://cdn.example.com/image.png');

			await useCase.execute(dtoWithImage, undefined);

			expect(mockImageService.uploadImage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				undefined,
			);
		});
	});
});

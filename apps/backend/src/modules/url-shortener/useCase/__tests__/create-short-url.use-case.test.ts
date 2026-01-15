import { CreateShortUrlUseCase } from '../create-short-url.use-case';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import { type Logger } from '@/core/logging';
import { mock } from 'jest-mock-extended';
import type { TShortUrl } from '../../domain/entities/short-url.entity';
import type { TCreateShortUrlDto } from '@shared/schemas';

describe('CreateShortUrlUseCase', () => {
	let useCase: CreateShortUrlUseCase;
	let mockRepository: jest.Mocked<ShortUrlRepository>;
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		mockRepository = mock<ShortUrlRepository>();
		mockLogger = mock<Logger>();
		useCase = new CreateShortUrlUseCase(mockRepository, mockLogger);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		const mockDto: TCreateShortUrlDto = {
			destinationUrl: 'https://example.com',
			isActive: true,
		};

		const mockUserId = 'user_123';
		const mockId = 'short_url_123';
		const mockShortCode = 'ABC12';

		const mockCreatedShortUrl: TShortUrl = {
			id: mockId,
			shortCode: mockShortCode,
			destinationUrl: mockDto.destinationUrl,
			isActive: mockDto.isActive,
			qrCodeId: null,
			createdBy: mockUserId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		it('should generate unique shortCode for new short URL', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.generateShortCode).toHaveBeenCalledTimes(1);
		});

		it('should create short URL with provided destinationUrl', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			const result = await useCase.execute(mockDto, mockUserId);

			expect(result.destinationUrl).toBe(mockDto.destinationUrl);
		});

		it('should create short URL with null destinationUrl for reserved URLs', async () => {
			const reservedDto: TCreateShortUrlDto = {
				destinationUrl: null,
				isActive: false,
			};

			const reservedShortUrl: TShortUrl = {
				...mockCreatedShortUrl,
				destinationUrl: null,
				isActive: false,
			};

			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(reservedShortUrl);

			const result = await useCase.execute(reservedDto, mockUserId);

			expect(result.destinationUrl).toBeNull();
			expect(result.isActive).toBe(false);
		});

		it('should set createdBy to provided userId', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			const result = await useCase.execute(mockDto, mockUserId);

			expect(result.createdBy).toBe(mockUserId);
		});

		it('should log successful creation', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockLogger.info).toHaveBeenCalledWith('Short URL created successfully', {
				id: mockId,
				createdBy: mockUserId,
			});
		});

		it('should call repository.generateId() once', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.generateId).toHaveBeenCalledTimes(1);
		});

		it('should call repository.generateShortCode() once', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.generateShortCode).toHaveBeenCalledTimes(1);
		});

		it('should call repository.create() with correct data', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.create).toHaveBeenCalledWith({
				id: mockId,
				shortCode: mockShortCode,
				destinationUrl: mockDto.destinationUrl,
				isActive: mockDto.isActive,
				qrCodeId: null,
				createdBy: mockUserId,
			});
		});

		it('should retrieve created entity after insertion', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.findOneById).toHaveBeenCalledWith(mockId);
		});

		it('should throw error when repository.create() fails', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockRejectedValue(new Error('Database error'));

			await expect(useCase.execute(mockDto, mockUserId)).rejects.toThrow('Database error');
		});

		it('should throw error when created entity cannot be retrieved', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(undefined);

			await expect(useCase.execute(mockDto, mockUserId)).rejects.toThrow(
				'Failed to create ShortUrl',
			);
		});

		it('should set qrCodeId to null initially', async () => {
			mockRepository.generateId.mockResolvedValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					qrCodeId: null,
				}),
			);
		});
	});
});

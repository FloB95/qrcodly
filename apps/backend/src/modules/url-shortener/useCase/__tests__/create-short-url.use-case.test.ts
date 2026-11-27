import { CreateShortUrlUseCase } from '../create-short-url.use-case';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import type { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import { type Logger } from '@/core/logging';
import { mock } from 'jest-mock-extended';
import {
	SHORT_URL_SAFETY_DEFAULTS,
	type TShortUrlWithDomain,
} from '../../domain/entities/short-url.entity';
import type { DestinationUrlSafetyService } from '../../service/destination-url-safety.service';
import type { ShortUrlAliasService } from '../../service/short-url-alias.service';
import { ShortUrlAliasRequiresCustomDomainError } from '../../error/http/short-url-alias-requires-custom-domain.error';
import { ShortUrlAliasTakenError } from '../../error/http/short-url-alias-taken.error';

describe('CreateShortUrlUseCase', () => {
	let useCase: CreateShortUrlUseCase;
	let mockRepository: jest.Mocked<ShortUrlRepository>;
	let mockCustomDomainValidationService: jest.Mocked<CustomDomainValidationService>;
	let mockLogger: jest.Mocked<Logger>;
	let mockDestinationUrlSafetyService: jest.Mocked<DestinationUrlSafetyService>;
	let mockShortUrlAliasService: jest.Mocked<ShortUrlAliasService>;

	beforeEach(() => {
		mockRepository = mock<ShortUrlRepository>();
		mockCustomDomainValidationService = mock<CustomDomainValidationService>();
		mockLogger = mock<Logger>();
		mockDestinationUrlSafetyService = mock<DestinationUrlSafetyService>();
		mockShortUrlAliasService = mock<ShortUrlAliasService>();
		useCase = new CreateShortUrlUseCase(
			mockRepository,
			mockCustomDomainValidationService,
			mockLogger,
			mockDestinationUrlSafetyService,
			mockShortUrlAliasService,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		const mockDto = {
			destinationUrl: 'https://example.com',
			customDomainId: null,
			isActive: true,
		};

		const mockUserId = 'user_123';
		const mockId = 'short_url_123';
		const mockShortCode = 'ABC12';

		const mockCreatedShortUrl: TShortUrlWithDomain = {
			id: mockId,
			shortCode: mockShortCode,
			alias: null,
			name: null,
			destinationUrl: mockDto.destinationUrl,
			customDomainId: null,
			customDomain: null,
			isActive: mockDto.isActive,
			qrCodeId: null,
			hostedPageId: null,
			createdBy: mockUserId,
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			...SHORT_URL_SAFETY_DEFAULTS,
		};

		it('should generate unique shortCode for new short URL', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.generateShortCode).toHaveBeenCalledTimes(1);
		});

		it('should create short URL with provided destinationUrl', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			const result = await useCase.execute(mockDto, mockUserId);

			expect(result.destinationUrl).toBe(mockDto.destinationUrl);
		});

		it('should create short URL with null destinationUrl for reserved URLs', async () => {
			const reservedDto = {
				destinationUrl: null as string | null,
				customDomainId: null,
				isActive: false,
			};

			const reservedShortUrl: TShortUrlWithDomain = {
				...mockCreatedShortUrl,
				destinationUrl: null,
				isActive: false,
			};

			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(reservedShortUrl);

			const result = await useCase.execute(reservedDto, mockUserId);

			expect(result.destinationUrl).toBeNull();
			expect(result.isActive).toBe(false);
		});

		it('should set createdBy to provided userId', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			const result = await useCase.execute(mockDto, mockUserId);

			expect(result.createdBy).toBe(mockUserId);
		});

		it('should log successful creation', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockLogger.info).toHaveBeenCalledWith('shortUrl.created', {
				shortUrl: {
					id: mockId,
					createdBy: mockUserId,
					customDomainId: mockDto.customDomainId,
					alias: null,
				},
			});
		});

		it('should call repository.generateId() once', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.generateId).toHaveBeenCalledTimes(1);
		});

		it('should call repository.generateShortCode() once', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.generateShortCode).toHaveBeenCalledTimes(1);
		});

		it('should call repository.create() with correct data', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.create).toHaveBeenCalledWith({
				id: mockId,
				shortCode: mockShortCode,
				alias: null,
				name: null,
				destinationUrl: mockDto.destinationUrl,
				customDomainId: mockDto.customDomainId,
				isActive: mockDto.isActive,
				qrCodeId: null,
				createdBy: mockUserId,
				deletedAt: null,
			});
		});

		it('should retrieve created entity after insertion', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute(mockDto, mockUserId);

			expect(mockRepository.findOneById).toHaveBeenCalledWith(mockId);
		});

		it('should refuse an alias for a short URL without a custom domain', async () => {
			await expect(useCase.execute({ ...mockDto, alias: 'menu' }, mockUserId)).rejects.toThrow(
				ShortUrlAliasRequiresCustomDomainError,
			);
			expect(mockRepository.create).not.toHaveBeenCalled();
		});

		it('should check the alias before creating and store it with the short URL', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(mockCreatedShortUrl);

			await useCase.execute({ ...mockDto, customDomainId: 'domain-1', alias: 'menu' }, mockUserId);

			expect(mockShortUrlAliasService.assertAvailable).toHaveBeenCalledWith('domain-1', 'menu');
			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({ customDomainId: 'domain-1', alias: 'menu' }),
			);
		});

		it('should report a taken alias when the insert loses a race for it', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockRejectedValue(
				Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }),
			);

			await expect(
				useCase.execute({ ...mockDto, customDomainId: 'domain-1', alias: 'menu' }, mockUserId),
			).rejects.toThrow(ShortUrlAliasTakenError);
		});

		it('should throw error when repository.create() fails', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockRejectedValue(new Error('Database error'));

			await expect(useCase.execute(mockDto, mockUserId)).rejects.toThrow('Database error');
		});

		it('should throw error when created entity cannot be retrieved', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
			mockRepository.generateShortCode.mockResolvedValue(mockShortCode);
			mockRepository.create.mockResolvedValue();
			mockRepository.findOneById.mockResolvedValue(undefined);

			await expect(useCase.execute(mockDto, mockUserId)).rejects.toThrow(
				'Failed to create ShortUrl',
			);
		});

		it('should set qrCodeId to null initially', async () => {
			mockRepository.generateId.mockReturnValue(mockId);
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

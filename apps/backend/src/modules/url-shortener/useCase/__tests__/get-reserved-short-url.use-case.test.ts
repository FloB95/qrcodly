import { GetReservedShortCodeUseCase } from '../get-reserved-short-url.use-case';
import { type CreateShortUrlUseCase } from '../create-short-url.use-case';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import { mock } from 'jest-mock-extended';
import type { TShortUrl, TShortUrlWithDomain } from '../../domain/entities/short-url.entity';
import type { GetDefaultCustomDomainUseCase } from '@/modules/custom-domain/useCase/get-default-custom-domain.use-case';
import type { Logger } from '@/core/logging';

describe('GetReservedShortCodeUseCase', () => {
	let useCase: GetReservedShortCodeUseCase;
	let mockRepository: jest.Mocked<ShortUrlRepository>;
	let mockCreateUseCase: jest.Mocked<CreateShortUrlUseCase>;
	let mockGetDefaultDomainUseCase: jest.Mocked<GetDefaultCustomDomainUseCase>;
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		mockRepository = mock<ShortUrlRepository>();
		mockCreateUseCase = mock<CreateShortUrlUseCase>();
		mockGetDefaultDomainUseCase = mock<GetDefaultCustomDomainUseCase>();
		mockLogger = mock<Logger>();
		useCase = new GetReservedShortCodeUseCase(
			mockRepository,
			mockCreateUseCase,
			mockGetDefaultDomainUseCase,
			mockLogger,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		const mockUserId = 'user_123';

		const mockReservedShortUrl: TShortUrl = {
			id: 'short_url_123',
			shortCode: 'ABC12',
			destinationUrl: null,
			customDomainId: null,
			isActive: false,
			qrCodeId: null,
			createdBy: mockUserId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const mockReservedShortUrlWithDomain: TShortUrlWithDomain = {
			...mockReservedShortUrl,
			customDomain: null,
		};

		it('should return existing reserved short URL when user has one', async () => {
			mockRepository.findAll.mockResolvedValue([mockReservedShortUrl]);
			mockRepository.findOneById.mockResolvedValue(mockReservedShortUrlWithDomain);

			const result = await useCase.execute(mockUserId);

			expect(result).toEqual(mockReservedShortUrlWithDomain);
			expect(mockRepository.findOneById).toHaveBeenCalledWith(mockReservedShortUrl.id);
			expect(mockCreateUseCase.execute).not.toHaveBeenCalled();
		});

		it('should query for URLs with destinationUrl=null, qrCodeId=null, createdBy=userId', async () => {
			mockRepository.findAll.mockResolvedValue([mockReservedShortUrl]);
			mockRepository.findOneById.mockResolvedValue(mockReservedShortUrlWithDomain);

			await useCase.execute(mockUserId);

			expect(mockRepository.findAll).toHaveBeenCalledWith({
				limit: 1,
				page: 0,
				where: {
					createdBy: {
						eq: mockUserId,
					},
					destinationUrl: {
						eq: null,
					},
					qrCodeId: {
						eq: null,
					},
				},
			});
		});

		it('should return first reserved URL when multiple exist', async () => {
			const mockReservedShortUrl2: TShortUrl = {
				...mockReservedShortUrl,
				id: 'short_url_456',
				shortCode: 'XYZ99',
			};

			mockRepository.findAll.mockResolvedValue([mockReservedShortUrl, mockReservedShortUrl2]);
			mockRepository.findOneById.mockResolvedValue(mockReservedShortUrlWithDomain);

			const result = await useCase.execute(mockUserId);

			expect(result).toEqual(mockReservedShortUrlWithDomain);
			expect(result.id).toBe('short_url_123');
		});

		it('should create new reserved short URL when user has none', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockGetDefaultDomainUseCase.execute.mockResolvedValue(undefined);
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrlWithDomain);

			const result = await useCase.execute(mockUserId);

			expect(mockGetDefaultDomainUseCase.execute).toHaveBeenCalledWith(mockUserId);
			expect(mockCreateUseCase.execute).toHaveBeenCalledWith(
				{
					destinationUrl: null,
					customDomainId: null,
					isActive: false,
				},
				mockUserId,
			);
			expect(result).toEqual(mockReservedShortUrlWithDomain);
		});

		it('should call CreateShortUrlUseCase with correct parameters', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockGetDefaultDomainUseCase.execute.mockResolvedValue(undefined);
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrlWithDomain);

			await useCase.execute(mockUserId);

			expect(mockCreateUseCase.execute).toHaveBeenCalledTimes(1);

			expect(mockCreateUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					destinationUrl: null,
					isActive: false,
				}),
				mockUserId,
			);
		});

		it('should set isActive=false for new reserved URL', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockGetDefaultDomainUseCase.execute.mockResolvedValue(undefined);
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrlWithDomain);

			await useCase.execute(mockUserId);

			expect(mockCreateUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					isActive: false,
				}),
				mockUserId,
			);
		});

		it('should use default custom domain when creating new reserved URL', async () => {
			const mockDefaultDomain = {
				id: 'domain_123',
				domain: 'custom.example.com',
				createdBy: mockUserId,
				isVerified: true,
				isCnameValid: true,
				isDefault: true,
				verificationToken: 'token_123',
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			mockRepository.findAll.mockResolvedValue([]);
			mockGetDefaultDomainUseCase.execute.mockResolvedValue(mockDefaultDomain);
			mockCreateUseCase.execute.mockResolvedValue({
				...mockReservedShortUrlWithDomain,
				customDomainId: mockDefaultDomain.id,
				customDomain: mockDefaultDomain,
			});

			await useCase.execute(mockUserId);

			expect(mockCreateUseCase.execute).toHaveBeenCalledWith(
				{
					destinationUrl: null,
					customDomainId: mockDefaultDomain.id,
					isActive: false,
				},
				mockUserId,
			);
		});

		it('should not return URLs that have qrCodeId set (already linked)', async () => {
			// Repository should filter these out based on the query
			mockRepository.findAll.mockResolvedValue([]);
			mockGetDefaultDomainUseCase.execute.mockResolvedValue(undefined);
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrlWithDomain);

			await useCase.execute(mockUserId);

			// Verify query specifically looks for qrCodeId: null

			expect(mockRepository.findAll).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						qrCodeId: {
							eq: null,
						},
					}),
				}),
			);
		});

		it('should not return URLs that have destinationUrl set (already in use)', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockGetDefaultDomainUseCase.execute.mockResolvedValue(undefined);
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrlWithDomain);

			await useCase.execute(mockUserId);

			// Verify query specifically looks for destinationUrl: null

			expect(mockRepository.findAll).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						destinationUrl: {
							eq: null,
						},
					}),
				}),
			);
		});

		it('should limit results to 1 for efficiency', async () => {
			mockRepository.findAll.mockResolvedValue([mockReservedShortUrl]);
			mockRepository.findOneById.mockResolvedValue(mockReservedShortUrlWithDomain);

			await useCase.execute(mockUserId);

			expect(mockRepository.findAll).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 1,
					page: 0,
				}),
			);
		});

		it('should update reserved URL domain when user default domain has changed', async () => {
			const mockDefaultDomain = {
				id: 'domain_456',
				domain: 'new.example.com',
				createdBy: mockUserId,
				isVerified: true,
				isCnameValid: true,
				isDefault: true,
				verificationToken: 'token_456',
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Existing reserved URL has different customDomainId
			const existingWithOldDomain: TShortUrl = {
				...mockReservedShortUrl,
				customDomainId: 'old_domain_123',
			};

			mockGetDefaultDomainUseCase.execute.mockResolvedValue(mockDefaultDomain);
			mockRepository.findAll.mockResolvedValue([existingWithOldDomain]);
			mockRepository.findOneById.mockResolvedValue({
				...existingWithOldDomain,
				customDomainId: mockDefaultDomain.id,
				customDomain: mockDefaultDomain,
			});

			await useCase.execute(mockUserId);

			// Should update the reserved URL with the new default domain
			expect(mockRepository.update).toHaveBeenCalledWith(existingWithOldDomain, {
				customDomainId: mockDefaultDomain.id,
				updatedAt: expect.any(Date),
			});
		});

		it('should update reserved URL domain to null when user clears default domain', async () => {
			// Existing reserved URL has a custom domain
			const existingWithDomain: TShortUrl = {
				...mockReservedShortUrl,
				customDomainId: 'old_domain_123',
			};

			// User has no default domain
			mockGetDefaultDomainUseCase.execute.mockResolvedValue(undefined);
			mockRepository.findAll.mockResolvedValue([existingWithDomain]);
			mockRepository.findOneById.mockResolvedValue({
				...existingWithDomain,
				customDomainId: null,
				customDomain: null,
			});

			await useCase.execute(mockUserId);

			// Should update the reserved URL to remove the domain
			expect(mockRepository.update).toHaveBeenCalledWith(existingWithDomain, {
				customDomainId: null,
				updatedAt: expect.any(Date),
			});
		});

		it('should not update reserved URL when domain matches default', async () => {
			const mockDefaultDomain = {
				id: 'domain_123',
				domain: 'custom.example.com',
				createdBy: mockUserId,
				isVerified: true,
				isCnameValid: true,
				isDefault: true,
				verificationToken: 'token_123',
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Reserved URL already has the correct domain
			const existingWithCorrectDomain: TShortUrl = {
				...mockReservedShortUrl,
				customDomainId: 'domain_123',
			};

			mockGetDefaultDomainUseCase.execute.mockResolvedValue(mockDefaultDomain);
			mockRepository.findAll.mockResolvedValue([existingWithCorrectDomain]);
			mockRepository.findOneById.mockResolvedValue({
				...existingWithCorrectDomain,
				customDomain: mockDefaultDomain,
			});

			await useCase.execute(mockUserId);

			// Should NOT call update since domain matches
			expect(mockRepository.update).not.toHaveBeenCalled();
		});
	});
});

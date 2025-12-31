import { GetReservedShortCodeUseCase } from '../get-reserved-short-url.use-case';
import { type CreateShortUrlUseCase } from '../create-short-url.use-case';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import { mock } from 'jest-mock-extended';
import type { TShortUrl } from '../../domain/entities/short-url.entity';

describe('GetReservedShortCodeUseCase', () => {
	let useCase: GetReservedShortCodeUseCase;
	let mockRepository: jest.Mocked<ShortUrlRepository>;
	let mockCreateUseCase: jest.Mocked<CreateShortUrlUseCase>;

	beforeEach(() => {
		mockRepository = mock<ShortUrlRepository>();
		mockCreateUseCase = mock<CreateShortUrlUseCase>();
		useCase = new GetReservedShortCodeUseCase(mockRepository, mockCreateUseCase);
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
			isActive: false,
			qrCodeId: null,
			createdBy: mockUserId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		it('should return existing reserved short URL when user has one', async () => {
			mockRepository.findAll.mockResolvedValue([mockReservedShortUrl]);

			const result = await useCase.execute(mockUserId);

			expect(result).toEqual(mockReservedShortUrl);
			expect(mockCreateUseCase.execute).not.toHaveBeenCalled();
		});

		it('should query for URLs with destinationUrl=null, qrCodeId=null, createdBy=userId', async () => {
			mockRepository.findAll.mockResolvedValue([mockReservedShortUrl]);

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

			const result = await useCase.execute(mockUserId);

			expect(result).toEqual(mockReservedShortUrl);
			expect(result.id).toBe('short_url_123');
		});

		it('should create new reserved short URL when user has none', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

			const result = await useCase.execute(mockUserId);

			expect(mockCreateUseCase.execute).toHaveBeenCalledWith(
				{
					destinationUrl: null,
					isActive: false,
				},
				mockUserId,
			);
			expect(result).toEqual(mockReservedShortUrl);
		});

		it('should call CreateShortUrlUseCase with correct parameters', async () => {
			mockRepository.findAll.mockResolvedValue([]);
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

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
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

			await useCase.execute(mockUserId);

			expect(mockCreateUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					isActive: false,
				}),
				mockUserId,
			);
		});

		it('should not return URLs that have qrCodeId set (already linked)', async () => {
			// Repository should filter these out based on the query
			mockRepository.findAll.mockResolvedValue([]);
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

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
			mockCreateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

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

			await useCase.execute(mockUserId);

			expect(mockRepository.findAll).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 1,
					page: 0,
				}),
			);
		});
	});
});

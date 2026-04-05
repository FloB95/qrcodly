import 'reflect-metadata';
import { ListShortUrlsUseCase } from '../list-short-urls.use-case';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import type TagRepository from '@/modules/tag/domain/repository/tag.repository';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TShortUrlWithDomainAndTags } from '../../domain/entities/short-url.entity';
import { type TTag } from '@/modules/tag/domain/entities/tag.entity';

describe('ListShortUrlsUseCase', () => {
	let useCase: ListShortUrlsUseCase;
	let mockShortUrlRepository: MockProxy<ShortUrlRepository>;
	let mockTagRepository: MockProxy<TagRepository>;

	const userId = 'user-123';

	const mockTag: TTag = {
		id: 'tag-1',
		name: 'Test Tag',
		color: '#FF5733',
		createdBy: userId,
		createdAt: new Date(),
		updatedAt: null,
	};

	const mockShortUrl: TShortUrlWithDomainAndTags = {
		id: 'short-url-1',
		shortCode: 'ABC12',
		name: null,
		destinationUrl: 'https://example.com',
		customDomainId: null,
		customDomain: null,
		isActive: true,
		qrCodeId: null,
		createdBy: userId,
		createdAt: new Date(),
		updatedAt: null,
		deletedAt: null,
		tags: [],
	};

	const mockShortUrl2: TShortUrlWithDomainAndTags = {
		...mockShortUrl,
		id: 'short-url-2',
		shortCode: 'XYZ99',
		destinationUrl: 'https://another.com',
		tags: [],
	};

	beforeEach(() => {
		mockShortUrlRepository = mock<ShortUrlRepository>();
		mockTagRepository = mock<TagRepository>();
		useCase = new ListShortUrlsUseCase(mockShortUrlRepository, mockTagRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should return short URLs and total count for user', async () => {
			mockShortUrlRepository.findAllWithDomain.mockResolvedValue([mockShortUrl]);
			mockShortUrlRepository.countTotalFiltered.mockResolvedValue(1);
			mockTagRepository.findTagsByShortUrlIds.mockResolvedValue(new Map());

			const result = await useCase.execute({ limit: 10, page: 1 }, userId);

			expect(result.shortUrls).toHaveLength(1);
			expect(result.total).toBe(1);
		});

		it('should filter short URLs by userId', async () => {
			mockShortUrlRepository.findAllWithDomain.mockResolvedValue([]);
			mockShortUrlRepository.countTotalFiltered.mockResolvedValue(0);
			mockTagRepository.findTagsByShortUrlIds.mockResolvedValue(new Map());

			await useCase.execute({ limit: 10, page: 1 }, userId);

			expect(mockShortUrlRepository.findAllWithDomain).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ createdBy: { eq: userId } }),
				}),
			);
		});

		it('should attach tags to each short URL', async () => {
			mockShortUrlRepository.findAllWithDomain.mockResolvedValue([mockShortUrl]);
			mockShortUrlRepository.countTotalFiltered.mockResolvedValue(1);
			const tagsMap = new Map([[mockShortUrl.id, [mockTag]]]);
			mockTagRepository.findTagsByShortUrlIds.mockResolvedValue(tagsMap);

			const result = await useCase.execute({ limit: 10, page: 1 }, userId);

			expect(result.shortUrls[0].tags).toEqual([mockTag]);
		});

		it('should attach empty tags array when no tags exist for a short URL', async () => {
			mockShortUrlRepository.findAllWithDomain.mockResolvedValue([mockShortUrl]);
			mockShortUrlRepository.countTotalFiltered.mockResolvedValue(1);
			mockTagRepository.findTagsByShortUrlIds.mockResolvedValue(new Map());

			const result = await useCase.execute({ limit: 10, page: 1 }, userId);

			expect(result.shortUrls[0].tags).toEqual([]);
		});

		it('should batch-fetch tags for all returned short URLs', async () => {
			mockShortUrlRepository.findAllWithDomain.mockResolvedValue([mockShortUrl, mockShortUrl2]);
			mockShortUrlRepository.countTotalFiltered.mockResolvedValue(2);
			mockTagRepository.findTagsByShortUrlIds.mockResolvedValue(new Map());

			await useCase.execute({ limit: 10, page: 1 }, userId);

			expect(mockTagRepository.findTagsByShortUrlIds).toHaveBeenCalledWith([
				mockShortUrl.id,
				mockShortUrl2.id,
			]);
		});

		it('should pass standalone filter to repository', async () => {
			mockShortUrlRepository.findAllWithDomain.mockResolvedValue([]);
			mockShortUrlRepository.countTotalFiltered.mockResolvedValue(0);
			mockTagRepository.findTagsByShortUrlIds.mockResolvedValue(new Map());

			await useCase.execute({ limit: 10, page: 1, standalone: true }, userId);

			expect(mockShortUrlRepository.findAllWithDomain).toHaveBeenCalledWith(
				expect.objectContaining({ standalone: true }),
			);
		});

		it('should pass tagIds filter to repository', async () => {
			mockShortUrlRepository.findAllWithDomain.mockResolvedValue([]);
			mockShortUrlRepository.countTotalFiltered.mockResolvedValue(0);
			mockTagRepository.findTagsByShortUrlIds.mockResolvedValue(new Map());

			const tagIds = ['tag-1', 'tag-2'];
			await useCase.execute({ limit: 10, page: 1, tagIds }, userId);

			expect(mockShortUrlRepository.findAllWithDomain).toHaveBeenCalledWith(
				expect.objectContaining({ tagIds }),
			);
		});

		it('should return empty list when no short URLs exist', async () => {
			mockShortUrlRepository.findAllWithDomain.mockResolvedValue([]);
			mockShortUrlRepository.countTotalFiltered.mockResolvedValue(0);
			mockTagRepository.findTagsByShortUrlIds.mockResolvedValue(new Map());

			const result = await useCase.execute({ limit: 10, page: 1 }, userId);

			expect(result.shortUrls).toEqual([]);
			expect(result.total).toBe(0);
		});

		it('should call countTotalFiltered with userId filter', async () => {
			mockShortUrlRepository.findAllWithDomain.mockResolvedValue([]);
			mockShortUrlRepository.countTotalFiltered.mockResolvedValue(0);
			mockTagRepository.findTagsByShortUrlIds.mockResolvedValue(new Map());

			await useCase.execute({ limit: 10, page: 1 }, userId);

			expect(mockShortUrlRepository.countTotalFiltered).toHaveBeenCalledWith(
				expect.objectContaining({ createdBy: { eq: userId } }),
				undefined,
				undefined,
			);
		});
	});
});

import 'reflect-metadata';
import { SetShortUrlTagsUseCase } from '../set-short-url-tags.use-case';
import type TagRepository from '../../domain/repository/tag.repository';
import type ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { type Logger } from '@/core/logging';
import { type DistributedLock } from '@/core/lock';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TTag } from '../../domain/entities/tag.entity';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { type TShortUrlWithDomain } from '@/modules/url-shortener/domain/entities/short-url.entity';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { BadRequestError, ForbiddenError } from '@/core/error/http';
import { MaxTagsExceededError } from '../../error/http/max-tags-exceeded.error';
import { PlanName } from '@/core/config/plan.config';

describe('SetShortUrlTagsUseCase', () => {
	let useCase: SetShortUrlTagsUseCase;
	let mockTagRepository: MockProxy<TagRepository>;
	let mockShortUrlRepository: MockProxy<ShortUrlRepository>;
	let mockLogger: MockProxy<Logger>;
	let mockLock: MockProxy<DistributedLock>;

	const userId = 'user-123';
	const shortUrlId = 'short-url-1';

	const mockUser: TUser = {
		id: userId,
		tokenType: 'session_token',
		plan: PlanName.FREE,
	};

	const mockShortUrl: TShortUrlWithDomain = {
		id: shortUrlId,
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
	};

	const mockTags: TTag[] = [
		{
			id: 'tag-1',
			name: 'Tag 1',
			color: '#FF0000',
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: null,
		},
	];

	beforeEach(() => {
		mockTagRepository = mock<TagRepository>();
		mockShortUrlRepository = mock<ShortUrlRepository>();
		mockLogger = mock<Logger>();
		mockLock = mock<DistributedLock>();

		useCase = new SetShortUrlTagsUseCase(
			mockTagRepository,
			mockShortUrlRepository,
			mockLogger,
			mockLock,
		);

		mockLock.withLock.mockImplementation((_key, fn) => fn());

		mockShortUrlRepository.findOneById.mockResolvedValue(mockShortUrl);
		mockTagRepository.findOneById.mockResolvedValue(mockTags[0]);
		mockTagRepository.setShortUrlTags.mockResolvedValue(undefined);
		mockTagRepository.findTagsByShortUrlId.mockResolvedValue(mockTags);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should set tags on a short URL and return them', async () => {
		const tagIds = ['tag-1'];

		const result = await useCase.execute(shortUrlId, tagIds, mockUser);

		expect(mockTagRepository.setShortUrlTags).toHaveBeenCalledWith(shortUrlId, tagIds);
		expect(result).toEqual(mockTags);
	});

	it('should throw ShortUrlNotFoundError when short URL does not exist', async () => {
		mockShortUrlRepository.findOneById.mockResolvedValue(undefined);

		await expect(useCase.execute(shortUrlId, ['tag-1'], mockUser)).rejects.toThrow(
			ShortUrlNotFoundError,
		);
	});

	it('should throw ForbiddenError when short URL belongs to another user', async () => {
		mockShortUrlRepository.findOneById.mockResolvedValue({
			...mockShortUrl,
			createdBy: 'other-user',
		});

		await expect(useCase.execute(shortUrlId, ['tag-1'], mockUser)).rejects.toThrow(ForbiddenError);
	});

	it('should throw BadRequestError when short URL is linked to a QR code', async () => {
		mockShortUrlRepository.findOneById.mockResolvedValue({
			...mockShortUrl,
			qrCodeId: 'qr-code-1',
		});

		await expect(useCase.execute(shortUrlId, ['tag-1'], mockUser)).rejects.toThrow(BadRequestError);
	});

	it('should throw ForbiddenError when a tag does not exist', async () => {
		mockTagRepository.findOneById.mockResolvedValue(undefined);

		await expect(useCase.execute(shortUrlId, ['tag-1'], mockUser)).rejects.toThrow(ForbiddenError);
	});

	it('should throw ForbiddenError when a tag belongs to another user', async () => {
		mockTagRepository.findOneById.mockResolvedValue({
			...mockTags[0],
			createdBy: 'other-user',
		} as TTag);

		await expect(useCase.execute(shortUrlId, ['tag-1'], mockUser)).rejects.toThrow(ForbiddenError);
	});

	it('should throw MaxTagsExceededError when too many tags are provided', async () => {
		const tooManyTagIds = ['tag-1', 'tag-2', 'tag-3', 'tag-4'];

		await expect(useCase.execute(shortUrlId, tooManyTagIds, mockUser)).rejects.toThrow(
			MaxTagsExceededError,
		);
	});

	it('should log tag assignment', async () => {
		await useCase.execute(shortUrlId, ['tag-1'], mockUser);

		expect(mockLogger.info).toHaveBeenCalledWith('tag.short-url-tags-set', {
			shortUrlTags: {
				shortUrlId,
				tagCount: 1,
				userId,
			},
		});
	});

	it('should use distributed lock for concurrent safety', async () => {
		await useCase.execute(shortUrlId, ['tag-1'], mockUser);

		expect(mockLock.withLock).toHaveBeenCalledWith(
			`tag:shorturl:${shortUrlId}`,
			expect.any(Function),
		);
	});

	it('should allow setting empty tag list to clear all tags', async () => {
		mockTagRepository.findTagsByShortUrlId.mockResolvedValue([]);

		const result = await useCase.execute(shortUrlId, [], mockUser);

		expect(mockTagRepository.setShortUrlTags).toHaveBeenCalledWith(shortUrlId, []);
		expect(result).toEqual([]);
	});
});

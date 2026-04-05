import 'reflect-metadata';
import { SetQrCodeTagsUseCase } from '../set-qr-code-tags.use-case';
import type TagRepository from '../../domain/repository/tag.repository';
import type QrCodeRepository from '@/modules/qr-code/domain/repository/qr-code.repository';
import { type Logger } from '@/core/logging';
import { type DistributedLock } from '@/core/lock';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TTag } from '../../domain/entities/tag.entity';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { type TQrCodeWithRelations } from '@/modules/qr-code/domain/entities/qr-code.entity';
import { QrCodeNotFoundError } from '@/modules/qr-code/error/http/qr-code-not-found.error';
import { ForbiddenError } from '@/core/error/http';
import { MaxTagsExceededError } from '../../error/http/max-tags-exceeded.error';
import { PlanName } from '@/core/config/plan.config';

describe('SetQrCodeTagsUseCase', () => {
	let useCase: SetQrCodeTagsUseCase;
	let mockTagRepository: MockProxy<TagRepository>;
	let mockQrCodeRepository: MockProxy<QrCodeRepository>;
	let mockLogger: MockProxy<Logger>;
	let mockLock: MockProxy<DistributedLock>;

	const userId = 'user-123';
	const qrCodeId = 'qr-code-1';

	const mockUser: TUser = {
		id: userId,
		tokenType: 'session_token',
		plan: PlanName.FREE,
	};

	const mockQrCode = {
		id: qrCodeId,
		createdBy: userId,
	} as TQrCodeWithRelations;

	const mockTags: TTag[] = [
		{
			id: 'tag-1',
			name: 'Tag 1',
			color: '#FF0000',
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: null,
		},
		{
			id: 'tag-2',
			name: 'Tag 2',
			color: '#00FF00',
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: null,
		},
	];

	beforeEach(() => {
		mockTagRepository = mock<TagRepository>();
		mockQrCodeRepository = mock<QrCodeRepository>();
		mockLogger = mock<Logger>();
		mockLock = mock<DistributedLock>();

		useCase = new SetQrCodeTagsUseCase(
			mockTagRepository,
			mockQrCodeRepository,
			mockLogger,
			mockLock,
		);

		// Default mock: lock executes the callback immediately
		mockLock.withLock.mockImplementation((_key, fn) => fn());

		mockQrCodeRepository.findOneById.mockResolvedValue(mockQrCode);
		mockTagRepository.findOneById.mockResolvedValue(mockTags[0]);
		mockTagRepository.setQrCodeTags.mockResolvedValue(undefined);
		mockTagRepository.findTagsByQrCodeId.mockResolvedValue(mockTags);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should set tags on a QR code and return them', async () => {
		const tagIds = ['tag-1', 'tag-2'];

		const result = await useCase.execute(qrCodeId, tagIds, mockUser);

		expect(mockTagRepository.setQrCodeTags).toHaveBeenCalledWith(qrCodeId, tagIds);
		expect(result).toEqual(mockTags);
	});

	it('should throw QrCodeNotFoundError when QR code does not exist', async () => {
		mockQrCodeRepository.findOneById.mockResolvedValue(undefined);

		await expect(useCase.execute(qrCodeId, ['tag-1'], mockUser)).rejects.toThrow(
			QrCodeNotFoundError,
		);
	});

	it('should throw ForbiddenError when QR code belongs to another user', async () => {
		mockQrCodeRepository.findOneById.mockResolvedValue({
			...mockQrCode,
			createdBy: 'other-user',
		} as TQrCodeWithRelations);

		await expect(useCase.execute(qrCodeId, ['tag-1'], mockUser)).rejects.toThrow(ForbiddenError);
	});

	it('should throw ForbiddenError when a tag does not exist', async () => {
		mockTagRepository.findOneById.mockResolvedValue(undefined);

		await expect(useCase.execute(qrCodeId, ['tag-1'], mockUser)).rejects.toThrow(ForbiddenError);
	});

	it('should throw ForbiddenError when a tag belongs to another user', async () => {
		mockTagRepository.findOneById.mockResolvedValue({
			...mockTags[0],
			createdBy: 'other-user',
		} as TTag);

		await expect(useCase.execute(qrCodeId, ['tag-1'], mockUser)).rejects.toThrow(ForbiddenError);
	});

	it('should throw MaxTagsExceededError when too many tags are provided', async () => {
		const tooManyTagIds = ['tag-1', 'tag-2', 'tag-3', 'tag-4'];

		await expect(useCase.execute(qrCodeId, tooManyTagIds, mockUser)).rejects.toThrow(
			MaxTagsExceededError,
		);
	});

	it('should log tag assignment', async () => {
		await useCase.execute(qrCodeId, ['tag-1'], mockUser);

		expect(mockLogger.info).toHaveBeenCalledWith('tag.qr-code-tags-set', {
			qrCodeTags: {
				qrCodeId,
				tagCount: 1,
				userId,
			},
		});
	});

	it('should use distributed lock for concurrent safety', async () => {
		await useCase.execute(qrCodeId, ['tag-1'], mockUser);

		expect(mockLock.withLock).toHaveBeenCalledWith(`tag:qrcode:${qrCodeId}`, expect.any(Function));
	});

	it('should allow setting empty tag list to clear all tags', async () => {
		mockTagRepository.findTagsByQrCodeId.mockResolvedValue([]);

		const result = await useCase.execute(qrCodeId, [], mockUser);

		expect(mockTagRepository.setQrCodeTags).toHaveBeenCalledWith(qrCodeId, []);
		expect(result).toEqual([]);
	});
});

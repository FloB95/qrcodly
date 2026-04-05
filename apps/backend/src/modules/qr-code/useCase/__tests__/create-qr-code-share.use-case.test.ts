import 'reflect-metadata';
import { CreateQrCodeShareUseCase } from '../create-qr-code-share.use-case';
import type QrCodeShareRepository from '../../domain/repository/qr-code-share.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TQrCodeShare } from '../../domain/entities/qr-code-share.entity';
import { QrCodeShareAlreadyExistsError } from '../../error/http/qr-code-share-already-exists.error';

describe('CreateQrCodeShareUseCase', () => {
	let useCase: CreateQrCodeShareUseCase;
	let mockRepository: MockProxy<QrCodeShareRepository>;
	let mockLogger: MockProxy<Logger>;

	const qrCodeId = 'qr-code-1';
	const userId = 'user-123';
	const shareId = 'share-1';

	const mockShare: TQrCodeShare = {
		id: shareId,
		qrCodeId,
		shareToken: 'token-uuid-1234',
		config: {
			showName: true,
			showDownloadButton: true,
		},
		isActive: true,
		createdBy: userId,
		createdAt: new Date(),
		updatedAt: null,
	};

	beforeEach(() => {
		mockRepository = mock<QrCodeShareRepository>();
		mockLogger = mock<Logger>();
		useCase = new CreateQrCodeShareUseCase(mockRepository, mockLogger);

		mockRepository.generateId.mockReturnValue(shareId);
		mockRepository.create.mockResolvedValue(undefined);
		mockRepository.findByQrCodeId.mockResolvedValue(mockShare);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should create a share and return it', async () => {
		const result = await useCase.execute(qrCodeId, userId);

		expect(mockRepository.create).toHaveBeenCalled();
		expect(result).toEqual(mockShare);
	});

	it('should use default config when no dto provided', async () => {
		await useCase.execute(qrCodeId, userId);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				config: { showName: true, showDownloadButton: true },
			}),
		);
	});

	it('should merge provided dto with default config', async () => {
		await useCase.execute(qrCodeId, userId, { showName: false });

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				config: { showName: false, showDownloadButton: true },
			}),
		);
	});

	it('should create share as active', async () => {
		await useCase.execute(qrCodeId, userId);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ isActive: true }),
		);
	});

	it('should set createdBy to userId', async () => {
		await useCase.execute(qrCodeId, userId);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ createdBy: userId }),
		);
	});

	it('should generate a unique share token', async () => {
		await useCase.execute(qrCodeId, userId);

		const [[createdShare]] = mockRepository.create.mock.calls;
		expect(typeof (createdShare as TQrCodeShare).shareToken).toBe('string');
		expect((createdShare as TQrCodeShare).shareToken.length).toBeGreaterThan(0);
	});

	it('should log share creation', async () => {
		await useCase.execute(qrCodeId, userId);

		expect(mockLogger.info).toHaveBeenCalledWith('qrCodeShare.created', expect.any(Object));
	});

	it('should throw QrCodeShareAlreadyExistsError on duplicate key error', async () => {
		const duplicateError = Object.assign(new Error('Duplicate'), { code: 'ER_DUP_ENTRY' });
		mockRepository.create.mockRejectedValue(duplicateError);

		await expect(useCase.execute(qrCodeId, userId)).rejects.toThrow(
			QrCodeShareAlreadyExistsError,
		);
	});

	it('should rethrow non-duplicate errors', async () => {
		mockRepository.create.mockRejectedValue(new Error('Database error'));

		await expect(useCase.execute(qrCodeId, userId)).rejects.toThrow('Database error');
	});

	it('should throw when created share cannot be retrieved', async () => {
		mockRepository.findByQrCodeId.mockResolvedValue(undefined);

		await expect(useCase.execute(qrCodeId, userId)).rejects.toThrow(
			'Failed to retrieve created share link.',
		);
	});
});

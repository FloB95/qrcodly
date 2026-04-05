import 'reflect-metadata';
import { UpdateQrCodeShareUseCase } from '../update-qr-code-share.use-case';
import type QrCodeShareRepository from '../../domain/repository/qr-code-share.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TQrCodeShare } from '../../domain/entities/qr-code-share.entity';

describe('UpdateQrCodeShareUseCase', () => {
	let useCase: UpdateQrCodeShareUseCase;
	let mockRepository: MockProxy<QrCodeShareRepository>;
	let mockLogger: MockProxy<Logger>;

	const mockShare: TQrCodeShare = {
		id: 'share-1',
		qrCodeId: 'qr-code-1',
		shareToken: 'token-uuid-1234',
		config: {
			showName: true,
			showDownloadButton: true,
		},
		isActive: true,
		createdBy: 'user-123',
		createdAt: new Date(),
		updatedAt: null,
	};

	const updatedShare: TQrCodeShare = {
		...mockShare,
		config: {
			showName: false,
			showDownloadButton: true,
		},
	};

	beforeEach(() => {
		mockRepository = mock<QrCodeShareRepository>();
		mockLogger = mock<Logger>();
		useCase = new UpdateQrCodeShareUseCase(mockRepository, mockLogger);

		mockRepository.update.mockResolvedValue(undefined);
		mockRepository.findByQrCodeId.mockResolvedValue(updatedShare);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should update config and return updated share', async () => {
		const result = await useCase.execute(mockShare, { showName: false });

		expect(mockRepository.update).toHaveBeenCalledWith(
			mockShare,
			expect.objectContaining({
				config: { showName: false, showDownloadButton: true },
			}),
		);
		expect(result).toEqual(updatedShare);
	});

	it('should return the original share unchanged when no diff', async () => {
		// Same config values - no update should happen
		const result = await useCase.execute(mockShare, {
			showName: true,
			showDownloadButton: true,
		});

		expect(mockRepository.update).not.toHaveBeenCalled();
		expect(result).toEqual(mockShare);
	});

	it('should log the update with diffs', async () => {
		await useCase.execute(mockShare, { showName: false });

		expect(mockLogger.info).toHaveBeenCalledWith('qrCodeShare.updated', {
			sharedQrCode: {
				shareId: mockShare.id,
				qrCodeId: mockShare.qrCodeId,
				updates: { showName: { oldValue: true, newValue: false } },
			},
		});
	});

	it('should merge dto with existing config', async () => {
		await useCase.execute(mockShare, { showDownloadButton: false });

		expect(mockRepository.update).toHaveBeenCalledWith(
			mockShare,
			expect.objectContaining({
				config: { showName: true, showDownloadButton: false },
			}),
		);
	});

	it('should throw when updated share cannot be retrieved', async () => {
		mockRepository.findByQrCodeId.mockResolvedValue(undefined);

		await expect(useCase.execute(mockShare, { showName: false })).rejects.toThrow(
			'Failed to retrieve updated share link.',
		);
	});
});

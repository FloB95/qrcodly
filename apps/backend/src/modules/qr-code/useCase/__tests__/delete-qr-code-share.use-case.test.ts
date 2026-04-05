import 'reflect-metadata';
import { DeleteQrCodeShareUseCase } from '../delete-qr-code-share.use-case';
import type QrCodeShareRepository from '../../domain/repository/qr-code-share.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TQrCodeShare } from '../../domain/entities/qr-code-share.entity';

describe('DeleteQrCodeShareUseCase', () => {
	let useCase: DeleteQrCodeShareUseCase;
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

	beforeEach(() => {
		mockRepository = mock<QrCodeShareRepository>();
		mockLogger = mock<Logger>();
		useCase = new DeleteQrCodeShareUseCase(mockRepository, mockLogger);
		mockRepository.delete.mockResolvedValue(true);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should delete the share', async () => {
		await useCase.execute(mockShare);

		expect(mockRepository.delete).toHaveBeenCalledWith(mockShare);
	});

	it('should log the deletion', async () => {
		await useCase.execute(mockShare);

		expect(mockLogger.info).toHaveBeenCalledWith('qrCodeShare.deleted', {
			sharedQrCode: {
				shareId: mockShare.id,
				qrCodeId: mockShare.qrCodeId,
			},
		});
	});

	it('should propagate repository errors', async () => {
		mockRepository.delete.mockRejectedValue(new Error('Database error'));

		await expect(useCase.execute(mockShare)).rejects.toThrow('Database error');
	});
});

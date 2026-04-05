import 'reflect-metadata';
import { GetPublicSharedQrCodeUseCase } from '../get-public-shared-qr-code.use-case';
import type QrCodeShareRepository from '../../domain/repository/qr-code-share.repository';
import type { ImageService } from '@/core/services/image.service';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TQrCodeShareWithQrCode } from '../../domain/entities/qr-code-share.entity';
import { QrCodeShareNotFoundError } from '../../error/http/qr-code-share-not-found.error';
import { QrCodeDefaults } from '@shared/schemas';

describe('GetPublicSharedQrCodeUseCase', () => {
	let useCase: GetPublicSharedQrCodeUseCase;
	let mockRepository: MockProxy<QrCodeShareRepository>;
	let mockImageService: MockProxy<ImageService>;
	let mockLogger: MockProxy<Logger>;

	const mockQrCodeContent = {
		type: 'url' as const,
		data: { url: 'https://example.com', isDynamic: false },
	};

	const mockShareWithQrCode: TQrCodeShareWithQrCode = {
		id: 'share-1',
		qrCodeId: 'qr-code-1',
		shareToken: 'share-token-abc',
		config: {
			showName: true,
			showDownloadButton: true,
		},
		isActive: true,
		createdBy: 'user-123',
		createdAt: new Date(),
		updatedAt: null,
		qrCode: {
			id: 'qr-code-1',
			name: 'My QR Code',
			content: mockQrCodeContent,
			config: QrCodeDefaults,
			qrCodeData: 'https://example.com',
			previewImage: null,
			createdBy: 'user-123',
			createdAt: new Date(),
			updatedAt: null,
		},
	};

	beforeEach(() => {
		mockRepository = mock<QrCodeShareRepository>();
		mockImageService = mock<ImageService>();
		mockLogger = mock<Logger>();

		useCase = new GetPublicSharedQrCodeUseCase(mockRepository, mockImageService, mockLogger);

		mockRepository.findByShareToken.mockResolvedValue(mockShareWithQrCode);
		mockImageService.getSignedUrl.mockResolvedValue('https://signed-url.example.com/image.png');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return public QR code data', async () => {
		const result = await useCase.execute('share-token-abc');

		expect(result.content).toEqual(mockQrCodeContent);
		expect(result.shareConfig).toEqual(mockShareWithQrCode.config);
	});

	it('should include name when showName is true in config', async () => {
		const result = await useCase.execute('share-token-abc');

		expect(result.name).toBe('My QR Code');
	});

	it('should hide name when showName is false in config', async () => {
		mockRepository.findByShareToken.mockResolvedValue({
			...mockShareWithQrCode,
			config: { showName: false, showDownloadButton: true },
		});

		const result = await useCase.execute('share-token-abc');

		expect(result.name).toBeNull();
	});

	it('should throw QrCodeShareNotFoundError when share does not exist', async () => {
		mockRepository.findByShareToken.mockResolvedValue(undefined);

		await expect(useCase.execute('invalid-token')).rejects.toThrow(QrCodeShareNotFoundError);
	});

	it('should throw QrCodeShareNotFoundError when share is inactive', async () => {
		mockRepository.findByShareToken.mockResolvedValue({
			...mockShareWithQrCode,
			isActive: false,
		});

		await expect(useCase.execute('share-token-abc')).rejects.toThrow(QrCodeShareNotFoundError);
	});

	it('should throw QrCodeShareNotFoundError when QR code is missing', async () => {
		mockRepository.findByShareToken.mockResolvedValue({
			...mockShareWithQrCode,
			qrCode: null as any,
		});

		await expect(useCase.execute('share-token-abc')).rejects.toThrow(QrCodeShareNotFoundError);
	});

	it('should convert preview image to signed URL', async () => {
		mockRepository.findByShareToken.mockResolvedValue({
			...mockShareWithQrCode,
			qrCode: {
				...mockShareWithQrCode.qrCode,
				previewImage: 's3://bucket/preview.png',
			},
		});

		const result = await useCase.execute('share-token-abc');

		expect(mockImageService.getSignedUrl).toHaveBeenCalledWith('s3://bucket/preview.png');
		expect(result.previewImage).toBe('https://signed-url.example.com/image.png');
	});

	it('should return null previewImage when no preview exists', async () => {
		const result = await useCase.execute('share-token-abc');

		expect(result.previewImage).toBeNull();
	});

	it('should log public access', async () => {
		await useCase.execute('share-token-abc');

		expect(mockLogger.debug).toHaveBeenCalledWith('qrCodeShare.publicAccess', expect.any(Object));
	});
});

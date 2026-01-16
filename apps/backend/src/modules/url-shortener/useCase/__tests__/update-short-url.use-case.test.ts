// @ts-nocheck
import { UpdateShortUrlUseCase } from '../update-short-url.use-case';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import type QrCodeRepository from '@/modules/qr-code/domain/repository/qr-code.repository';
import type CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { type Logger } from '@/core/logging';
import { type EventEmitter } from '@/core/event';
import { mock } from 'jest-mock-extended';
import type { TShortUrl } from '../../domain/entities/short-url.entity';
import type { TUpdateShortUrlDto } from '@shared/schemas';
import type { TQrCode } from '@shared/schemas';
import { QrCodeNotFoundError } from '@/modules/qr-code/error/http/qr-code-not-found.error';
import { RedirectLoopError } from '../../error/http/redirect-loop.error';
import { buildShortUrl } from '../../utils';

jest.mock('../../utils', () => ({
	buildShortUrl: jest.fn((shortCode: string) => `https://short.url/${shortCode}`),
}));

describe('UpdateShortUrlUseCase', () => {
	let useCase: UpdateShortUrlUseCase;
	let mockShortUrlRepository: jest.Mocked<ShortUrlRepository>;
	let mockCustomDomainRepository: jest.Mocked<CustomDomainRepository>;
	let mockQrCodeRepository: jest.Mocked<QrCodeRepository>;
	let mockLogger: jest.Mocked<Logger>;
	let mockEventEmitter: jest.Mocked<EventEmitter>;

	beforeEach(() => {
		mockShortUrlRepository = mock<ShortUrlRepository>();
		mockCustomDomainRepository = mock<CustomDomainRepository>();
		mockQrCodeRepository = mock<QrCodeRepository>();
		mockLogger = mock<Logger>();
		mockEventEmitter = mock<EventEmitter>();
		useCase = new UpdateShortUrlUseCase(
			mockShortUrlRepository,
			mockCustomDomainRepository,
			mockLogger,
			mockQrCodeRepository,
			mockEventEmitter,
		);
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		const mockUserId = 'user_123';
		const mockShortUrl: TShortUrl = {
			id: 'short_url_123',
			shortCode: 'ABC12',
			destinationUrl: 'https://example.com',
			customDomainId: null,
			isActive: true,
			qrCodeId: null,
			createdBy: mockUserId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		it('should update destinationUrl successfully', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			const updatedShortUrl: TShortUrl = {
				...mockShortUrl,
				destinationUrl: updateDto.destinationUrl,
				updatedAt: new Date(),
			};

			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue(updatedShortUrl);

			const result = await useCase.execute(mockShortUrl, updateDto, mockUserId);

			expect(result.destinationUrl).toBe(updateDto.destinationUrl);
		});

		it('should update isActive successfully', async () => {
			const updateDto: TUpdateShortUrlDto = {
				isActive: false,
			};

			const updatedShortUrl: TShortUrl = {
				...mockShortUrl,
				isActive: false,
				updatedAt: new Date(),
			};

			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue(updatedShortUrl);

			const result = await useCase.execute(mockShortUrl, updateDto, mockUserId);

			expect(result.isActive).toBe(false);
		});

		it('should set updatedAt timestamp', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue({
				...mockShortUrl,
				updatedAt: new Date(),
			});

			await useCase.execute(mockShortUrl, updateDto, mockUserId);

			expect(mockShortUrlRepository.update).toHaveBeenCalledWith(
				mockShortUrl,
				expect.objectContaining({
					updatedAt: expect.any(Date),
				}),
			);
		});

		it('should link qrCodeId when linkedQrCodeId provided', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			const qrCodeId = 'qr_code_123';
			const mockQrCode = {
				id: qrCodeId,
				content: {
					type: 'event' as const,
					data: {},
				},
			} as TQrCode;

			mockQrCodeRepository.findOneById.mockResolvedValue(mockQrCode);
			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue({
				...mockShortUrl,
				qrCodeId,
			});

			await useCase.execute(mockShortUrl, updateDto, mockUserId, qrCodeId);

			expect(mockShortUrlRepository.update).toHaveBeenCalledWith(
				mockShortUrl,
				expect.objectContaining({
					qrCodeId,
				}),
			);
		});

		it('should log successful update', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue(mockShortUrl);

			await useCase.execute(mockShortUrl, updateDto, mockUserId);

			expect(mockLogger.info).toHaveBeenCalledWith('Short URL updated successfully', {
				id: mockShortUrl.id,
				qrCodeId: mockShortUrl.qrCodeId,
				updates: expect.objectContaining({
					destinationUrl: updateDto.destinationUrl,
					updatedAt: expect.any(Date),
				}),
				updatedBy: mockUserId,
			});
		});

		// CRITICAL: Redirect loop prevention
		it('should throw RedirectLoopError when QR code type=url and destinationUrl points to same short URL', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://short.url/ABC12',
			};

			const qrCodeId = 'qr_code_123';
			const mockQrCode = {
				id: qrCodeId,
				content: {
					type: 'url' as const,
					data: {
						url: 'https://example.com',
						isEditable: true,
					},
				},
			} as TQrCode;

			mockQrCodeRepository.findOneById.mockResolvedValue(mockQrCode);

			await expect(useCase.execute(mockShortUrl, updateDto, mockUserId, qrCodeId)).rejects.toThrow(
				RedirectLoopError,
			);
		});

		it('should allow update when QR code type is not url', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://short.url/ABC12',
			};

			const qrCodeId = 'qr_code_123';
			const mockQrCode = {
				id: qrCodeId,
				content: {
					type: 'event' as const,
					data: {},
				},
			} as TQrCode;

			mockQrCodeRepository.findOneById.mockResolvedValue(mockQrCode);
			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue(mockShortUrl);

			await expect(
				useCase.execute(mockShortUrl, updateDto, mockUserId, qrCodeId),
			).resolves.toBeDefined();
		});

		it('should allow update when destinationUrl is different from short URL', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://completely-different.com',
			};

			const qrCodeId = 'qr_code_123';
			const mockQrCode = {
				id: qrCodeId,
				content: {
					type: 'url' as const,
					data: {
						url: 'https://example.com',
						isEditable: true,
					},
				},
			} as TQrCode;

			mockQrCodeRepository.findOneById.mockResolvedValue(mockQrCode);
			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue(mockShortUrl);

			await expect(
				useCase.execute(mockShortUrl, updateDto, mockUserId, qrCodeId),
			).resolves.toBeDefined();
		});

		it('should build short URL correctly using buildShortUrl()', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://short.url/ABC12',
			};

			const qrCodeId = 'qr_code_123';
			const mockQrCode = {
				id: qrCodeId,
				content: {
					type: 'url' as const,
					data: {
						url: 'https://example.com',
						isEditable: true,
					},
				},
			} as TQrCode;

			mockQrCodeRepository.findOneById.mockResolvedValue(mockQrCode);

			await expect(useCase.execute(mockShortUrl, updateDto, mockUserId, qrCodeId)).rejects.toThrow(
				RedirectLoopError,
			);

			expect(buildShortUrl).toHaveBeenCalledWith(mockShortUrl.shortCode);
		});

		it('should throw QrCodeNotFoundError when linkedQrCodeId provided but QR code does not exist', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			const qrCodeId = 'qr_code_123';
			mockQrCodeRepository.findOneById.mockResolvedValue(undefined);

			await expect(useCase.execute(mockShortUrl, updateDto, mockUserId, qrCodeId)).rejects.toThrow(
				QrCodeNotFoundError,
			);
		});

		it('should verify QR code exists before linking', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			const qrCodeId = 'qr_code_123';
			const mockQrCode = {
				id: qrCodeId,
				content: {
					type: 'event' as const,
					data: {},
				},
			} as TQrCode;

			mockQrCodeRepository.findOneById.mockResolvedValue(mockQrCode);
			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue(mockShortUrl);

			await useCase.execute(mockShortUrl, updateDto, mockUserId, qrCodeId);

			expect(mockQrCodeRepository.findOneById).toHaveBeenCalledWith(qrCodeId);
		});

		it('should call repository.update() with correct data', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
				isActive: false,
			};

			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue(mockShortUrl);

			await useCase.execute(mockShortUrl, updateDto, mockUserId);

			expect(mockShortUrlRepository.update).toHaveBeenCalledWith(mockShortUrl, {
				destinationUrl: updateDto.destinationUrl,
				isActive: updateDto.isActive,
				updatedAt: expect.any(Date),
				qrCodeId: undefined,
			});
		});

		it('should retrieve updated entity after update', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue(mockShortUrl);

			await useCase.execute(mockShortUrl, updateDto, mockUserId);

			expect(mockShortUrlRepository.findOneById).toHaveBeenCalledWith(mockShortUrl.id);
		});

		it('should handle repository update failures', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			mockShortUrlRepository.update.mockRejectedValue(new Error('Database error'));

			await expect(useCase.execute(mockShortUrl, updateDto, mockUserId)).rejects.toThrow(
				'Database error',
			);
		});

		it('should persist qrCodeId when linking', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			const qrCodeId = 'qr_code_123';
			const mockQrCode = {
				id: qrCodeId,
				content: {
					type: 'text' as const,
					data: 'Some text',
				},
			} as TQrCode;

			mockQrCodeRepository.findOneById.mockResolvedValue(mockQrCode);
			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue({
				...mockShortUrl,
				qrCodeId,
			});

			const result = await useCase.execute(mockShortUrl, updateDto, mockUserId, qrCodeId);

			expect(result.qrCodeId).toBe(qrCodeId);
		});

		it('should not call qrCodeRepository when no linkedQrCodeId provided', async () => {
			const updateDto: TUpdateShortUrlDto = {
				destinationUrl: 'https://new-example.com',
			};

			mockShortUrlRepository.update.mockResolvedValue();
			mockShortUrlRepository.findOneById.mockResolvedValue(mockShortUrl);

			await useCase.execute(mockShortUrl, updateDto, mockUserId);

			expect(mockQrCodeRepository.findOneById).not.toHaveBeenCalled();
		});
	});
});

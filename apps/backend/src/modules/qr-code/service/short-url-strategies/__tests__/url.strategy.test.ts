// @ts-nocheck
import 'reflect-metadata';
import { UrlStrategy } from '../url.strategy';
import { GetReservedShortCodeUseCase } from '@/modules/url-shortener/useCase/get-reserved-short-url.use-case';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import { GetDefaultCustomDomainUseCase } from '@/modules/custom-domain/useCase/get-default-custom-domain.use-case';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { LinkShortUrlContentTypeError } from '../../../error/http/link-short-url-content-type.error';
import { container } from 'tsyringe';
import type { TQrCode, TQrCodeContent } from '@shared/schemas';
import type { TShortUrl } from '@/modules/url-shortener/domain/entities/short-url.entity';

jest.mock('tsyringe', () => ({
	container: {
		resolve: jest.fn(),
	},
	singleton: () => (target: any) => target,
	injectable: () => (target: any) => target,
	inject: () => (target: any, propertyKey: string | symbol, parameterIndex: number) => {},
}));

describe('UrlStrategy', () => {
	let strategy: UrlStrategy;
	let mockGetReservedUseCase: jest.Mocked<GetReservedShortCodeUseCase>;
	let mockUpdateUseCase: jest.Mocked<UpdateShortUrlUseCase>;
	let mockGetDefaultDomainUseCase: jest.Mocked<GetDefaultCustomDomainUseCase>;

	beforeEach(() => {
		strategy = new UrlStrategy();
		mockGetReservedUseCase = {
			execute: jest.fn(),
		} as any;
		mockUpdateUseCase = {
			execute: jest.fn(),
		} as any;
		mockGetDefaultDomainUseCase = {
			execute: jest.fn().mockResolvedValue(undefined),
		} as any;

		(container.resolve as jest.Mock).mockImplementation((token) => {
			if (token === GetReservedShortCodeUseCase) return mockGetReservedUseCase;
			if (token === UpdateShortUrlUseCase) return mockUpdateUseCase;
			if (token === GetDefaultCustomDomainUseCase) return mockGetDefaultDomainUseCase;
			return null;
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('appliesTo', () => {
		it('should apply when content.type=url and data.isEditable=true', () => {
			const content: TQrCodeContent = {
				type: 'url',
				data: {
					url: 'https://example.com',
					isEditable: true,
				},
			};

			expect(strategy.appliesTo(content)).toBe(true);
		});

		it('should not apply when content.type=url and data.isEditable=false', () => {
			const content: TQrCodeContent = {
				type: 'url',
				data: {
					url: 'https://example.com',
					isEditable: false,
				},
			};

			expect(strategy.appliesTo(content)).toBe(false);
		});

		it('should not apply when content.type is not url', () => {
			const content: TQrCodeContent = {
				type: 'text',
				data: 'Some text',
			};

			expect(strategy.appliesTo(content)).toBe(false);
		});
	});

	describe('handle', () => {
		const mockQrCode: TQrCode = {
			id: 'qr_code_123',
			name: 'Test QR',
			content: {
				type: 'url',
				data: {
					url: 'https://example.com',
					isEditable: true,
				},
			},
			config: {} as any,
			previewImage: null,
			createdBy: 'user_123',
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const mockReservedShortUrl: TShortUrl = {
			id: 'short_url_123',
			shortCode: 'ABC12',
			destinationUrl: null,
			isActive: false,
			qrCodeId: null,
			createdBy: 'user_123',
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		it('should call GetReservedShortCodeUseCase.execute() with createdBy', async () => {
			mockGetReservedUseCase.execute.mockResolvedValue(mockReservedShortUrl);
			mockUpdateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

			await strategy.handle(mockQrCode);

			expect(mockGetReservedUseCase.execute).toHaveBeenCalledWith('user_123');
		});

		it('should throw ShortUrlNotFoundError when no reserved URL available', async () => {
			mockGetReservedUseCase.execute.mockResolvedValue(null as any);

			await expect(strategy.handle(mockQrCode)).rejects.toThrow(ShortUrlNotFoundError);
		});

		it('should call UpdateShortUrlUseCase.execute() with reserved URL', async () => {
			mockGetReservedUseCase.execute.mockResolvedValue(mockReservedShortUrl);
			mockUpdateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

			await strategy.handle(mockQrCode);

			expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
				mockReservedShortUrl,
				expect.objectContaining({
					destinationUrl: 'https://example.com',
					isActive: true,
				}),
				'user_123',
				'qr_code_123',
			);
		});

		it('should set destinationUrl to qrCode.content.data.url', async () => {
			mockGetReservedUseCase.execute.mockResolvedValue(mockReservedShortUrl);
			mockUpdateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

			await strategy.handle(mockQrCode);

			expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					destinationUrl: mockQrCode.content.data.url,
				}),
				expect.anything(),
				expect.anything(),
			);
		});

		it('should set isActive to true', async () => {
			mockGetReservedUseCase.execute.mockResolvedValue(mockReservedShortUrl);
			mockUpdateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

			await strategy.handle(mockQrCode);

			expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					isActive: true,
				}),
				expect.anything(),
				expect.anything(),
			);
		});

		it('should pass qrCodeId to UpdateShortUrlUseCase', async () => {
			mockGetReservedUseCase.execute.mockResolvedValue(mockReservedShortUrl);
			mockUpdateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

			await strategy.handle(mockQrCode);

			expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.anything(),
				'qr_code_123',
			);
		});

		it('should return reserved short URL', async () => {
			mockGetReservedUseCase.execute.mockResolvedValue(mockReservedShortUrl);
			mockUpdateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

			const result = await strategy.handle(mockQrCode);

			expect(result).toEqual(mockReservedShortUrl);
		});

		it('should throw LinkShortUrlContentTypeError when content.type is not url', async () => {
			const invalidQrCode: TQrCode = {
				...mockQrCode,
				content: {
					type: 'text',
					data: 'Some text',
				},
			};

			await expect(strategy.handle(invalidQrCode)).rejects.toThrow(LinkShortUrlContentTypeError);
		});
	});
});

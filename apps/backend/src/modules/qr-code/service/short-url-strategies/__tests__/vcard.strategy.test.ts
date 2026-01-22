/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import 'reflect-metadata';
import { VCardStrategy } from '../vcard.strategy';
import { GetReservedShortCodeUseCase } from '@/modules/url-shortener/useCase/get-reserved-short-url.use-case';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import { GetDefaultCustomDomainUseCase } from '@/modules/custom-domain/useCase/get-default-custom-domain.use-case';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { LinkShortUrlContentTypeError } from '../../../error/http/link-short-url-content-type.error';
import { DYNAMIC_QR_BASE_URL } from '@/modules/url-shortener/config/constants';
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

describe('VCardStrategy', () => {
	let strategy: VCardStrategy;
	let mockGetReservedUseCase: jest.Mocked<GetReservedShortCodeUseCase>;
	let mockUpdateUseCase: jest.Mocked<UpdateShortUrlUseCase>;
	let mockGetDefaultDomainUseCase: jest.Mocked<GetDefaultCustomDomainUseCase>;

	beforeEach(() => {
		strategy = new VCardStrategy();
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
		it('should apply when content.type=vCard and isDynamic=true', () => {
			const content: TQrCodeContent = {
				type: 'vCard',
				data: {
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
					isDynamic: true,
				},
			};

			expect(strategy.appliesTo(content)).toBe(true);
		});

		it('should not apply when content.type=vCard but isDynamic=false', () => {
			const content: TQrCodeContent = {
				type: 'vCard',
				data: {
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
					isDynamic: false,
				},
			};

			expect(strategy.appliesTo(content)).toBe(false);
		});

		it('should not apply when content.type=vCard but isDynamic is undefined', () => {
			const content: TQrCodeContent = {
				type: 'vCard',
				data: {
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
				},
			};

			expect(strategy.appliesTo(content)).toBe(false);
		});

		it('should not apply when content.type is not vCard', () => {
			const content: TQrCodeContent = {
				type: 'url',
				data: {
					url: 'https://example.com',
					isEditable: false,
				},
			};

			expect(strategy.appliesTo(content)).toBe(false);
		});
	});

	describe('handle', () => {
		const mockQrCode: TQrCode = {
			id: 'qr_code_123',
			name: 'Test vCard QR',
			content: {
				type: 'vCard',
				data: {
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
					phone: '+1234567890',
					isDynamic: true,
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
					destinationUrl: `${DYNAMIC_QR_BASE_URL}${mockQrCode.id}`,
					isActive: true,
				}),
				'user_123',
				'qr_code_123',
			);
		});

		it('should set destinationUrl to DYNAMIC_QR_BASE_URL + qrCodeId', async () => {
			mockGetReservedUseCase.execute.mockResolvedValue(mockReservedShortUrl);
			mockUpdateUseCase.execute.mockResolvedValue(mockReservedShortUrl);

			await strategy.handle(mockQrCode);

			expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					destinationUrl: `${DYNAMIC_QR_BASE_URL}qr_code_123`,
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

		it('should throw LinkShortUrlContentTypeError when content.type is not vCard', async () => {
			const invalidQrCode: TQrCode = {
				...mockQrCode,
				content: {
					type: 'url',
					data: {
						url: 'https://example.com',
						isEditable: false,
					},
				},
			};

			await expect(strategy.handle(invalidQrCode)).rejects.toThrow(LinkShortUrlContentTypeError);
		});
	});
});

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { ShortUrlStrategyService } from '../short-url-strategy.service';
import { UrlStrategy } from '../short-url-strategies/url.strategy';
import { EventUrlStrategy } from '../short-url-strategies/event.strategy';
import type { TQrCode } from '@shared/schemas';

// Mock the strategies
jest.mock('../short-url-strategies/url.strategy');
jest.mock('../short-url-strategies/event.strategy');

describe('ShortUrlStrategyService', () => {
	let service: ShortUrlStrategyService;
	let mockUrlStrategy: jest.Mocked<UrlStrategy>;
	let mockEventStrategy: jest.Mocked<EventUrlStrategy>;

	beforeEach(() => {
		mockUrlStrategy = new UrlStrategy() as jest.Mocked<UrlStrategy>;
		mockEventStrategy = new EventUrlStrategy() as jest.Mocked<EventUrlStrategy>;

		mockUrlStrategy.appliesTo = jest.fn();
		mockUrlStrategy.handle = jest.fn();
		mockEventStrategy.appliesTo = jest.fn();
		mockEventStrategy.handle = jest.fn();

		// Mock the constructor to return our mocked strategies
		(UrlStrategy as jest.MockedClass<typeof UrlStrategy>).mockImplementation(() => mockUrlStrategy);
		(EventUrlStrategy as jest.MockedClass<typeof EventUrlStrategy>).mockImplementation(
			() => mockEventStrategy,
		);

		service = new ShortUrlStrategyService();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('handle', () => {
		const mockEditableUrlQrCode: TQrCode = {
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

		const mockEventQrCode: TQrCode = {
			id: 'qr_code_456',
			name: 'Event QR',
			content: {
				type: 'event',
				data: {
					title: 'Test Event',
					startDate: new Date().toISOString(),
					endDate: new Date().toISOString(),
				},
			},
			config: {} as any,
			previewImage: null,
			createdBy: 'user_123',
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const mockTextQrCode: TQrCode = {
			id: 'qr_code_789',
			name: 'Text QR',
			content: {
				type: 'text',
				data: 'Some text content',
			},
			config: {} as any,
			previewImage: null,
			createdBy: 'user_123',
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const mockShortUrl = {
			id: 'short_url_123',
			shortCode: 'ABC12',
		};

		it('should initialize with UrlStrategy and EventUrlStrategy', () => {
			expect(UrlStrategy).toHaveBeenCalled();
			expect(EventUrlStrategy).toHaveBeenCalled();
		});

		it('should execute UrlStrategy when content.type=url and isEditable=true', async () => {
			mockUrlStrategy.appliesTo.mockReturnValue(true);
			mockUrlStrategy.handle.mockResolvedValue(mockShortUrl as any);
			mockEventStrategy.appliesTo.mockReturnValue(false);

			const result = await service.handle(mockEditableUrlQrCode);

			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockUrlStrategy.appliesTo).toHaveBeenCalledWith(mockEditableUrlQrCode.content);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockUrlStrategy.handle).toHaveBeenCalledWith(mockEditableUrlQrCode);
			expect(result).toEqual(mockShortUrl);
		});

		it('should execute EventUrlStrategy when content.type=event', async () => {
			mockUrlStrategy.appliesTo.mockReturnValue(false);
			mockEventStrategy.appliesTo.mockReturnValue(true);
			mockEventStrategy.handle.mockResolvedValue(mockShortUrl as any);

			const result = await service.handle(mockEventQrCode);

			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockEventStrategy.appliesTo).toHaveBeenCalledWith(mockEventQrCode.content);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockEventStrategy.handle).toHaveBeenCalledWith(mockEventQrCode);
			expect(result).toEqual(mockShortUrl);
		});

		it('should return null when no strategy applies (text, wifi, vCard)', async () => {
			mockUrlStrategy.appliesTo.mockReturnValue(false);
			mockEventStrategy.appliesTo.mockReturnValue(false);

			const result = await service.handle(mockTextQrCode);

			expect(result).toBeNull();
		});

		it('should return strategy result when strategy applies', async () => {
			mockUrlStrategy.appliesTo.mockReturnValue(true);
			mockUrlStrategy.handle.mockResolvedValue(mockShortUrl as any);

			const result = await service.handle(mockEditableUrlQrCode);

			expect(result).not.toBeNull();
			expect(result).toEqual(mockShortUrl);
		});

		it('should call strategy.appliesTo() to check applicability', async () => {
			mockUrlStrategy.appliesTo.mockReturnValue(false);
			mockEventStrategy.appliesTo.mockReturnValue(false);

			await service.handle(mockTextQrCode);

			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockUrlStrategy.appliesTo).toHaveBeenCalled();
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockEventStrategy.appliesTo).toHaveBeenCalled();
		});

		it('should call strategy.handle() with QR code when applicable', async () => {
			mockUrlStrategy.appliesTo.mockReturnValue(true);
			mockUrlStrategy.handle.mockResolvedValue(mockShortUrl as any);

			await service.handle(mockEditableUrlQrCode);

			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockUrlStrategy.handle).toHaveBeenCalledWith(mockEditableUrlQrCode);
		});

		it('should only execute first matching strategy', async () => {
			// Both strategies apply (hypothetically)
			mockUrlStrategy.appliesTo.mockReturnValue(true);
			mockUrlStrategy.handle.mockResolvedValue(mockShortUrl as any);
			mockEventStrategy.appliesTo.mockReturnValue(true);

			await service.handle(mockEditableUrlQrCode);

			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockUrlStrategy.handle).toHaveBeenCalled();
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockEventStrategy.handle).not.toHaveBeenCalled();
		});
	});
});

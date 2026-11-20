import 'reflect-metadata';
import { ScanTrackingEventHandler } from '../scan-tracking.event-handler';
import { ScanTrackingEvent } from '../../scan-tracking.event';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import type AnalyticsIntegrationRepository from '../../../domain/repository/analytics-integration.repository';
import { type CredentialEncryptionService } from '../../../service/credential-encryption.service';
import { type AnalyticsProviderRegistry } from '../../../service/providers/analytics-provider.registry';
import { type IAnalyticsProvider } from '../../../service/providers/analytics-provider.interface';
import { type TAnalyticsIntegration } from '../../../domain/entities/analytics-integration.entity';
import { container } from 'tsyringe';

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

describe('ScanTrackingEventHandler', () => {
	let handler: ScanTrackingEventHandler;
	let mockLogger: MockProxy<Logger>;
	let mockRepository: MockProxy<AnalyticsIntegrationRepository>;
	let mockEncryption: MockProxy<CredentialEncryptionService>;
	let mockProviderRegistry: MockProxy<AnalyticsProviderRegistry>;
	let mockProvider: MockProxy<IAnalyticsProvider>;

	const mockEventData = {
		userId: 'user-123',
		url: 'https://example.com',
		userAgent: 'Mozilla/5.0',
		hostname: 'example.com',
		language: 'en-US',
		referrer: '',
		ip: '127.0.0.1',
		deviceType: 'desktop',
		browserName: 'Chrome',
	};

	const mockIntegration = {
		id: 'int-1',
		providerType: 'google_analytics' as const,
		encryptedCredentials: 'encrypted',
		encryptionIv: 'iv',
		encryptionTag: 'tag',
		consecutiveFailures: 0,
		isEnabled: true,
		createdBy: 'user-123',
	} as TAnalyticsIntegration;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockRepository = mock<AnalyticsIntegrationRepository>();
		mockEncryption = mock<CredentialEncryptionService>();
		mockProviderRegistry = mock<AnalyticsProviderRegistry>();
		mockProvider = mock<IAnalyticsProvider>();

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'Logger':
					return mockLogger;
				case 'AnalyticsIntegrationRepository':
					return mockRepository;
				case 'CredentialEncryptionService':
					return mockEncryption;
				case 'AnalyticsProviderRegistry':
					return mockProviderRegistry;
				default:
					return {};
			}
		});

		mockProviderRegistry.getProvider.mockReturnValue(mockProvider);
		mockEncryption.decrypt.mockReturnValue({ measurementId: 'G-123', apiSecret: 'secret' });

		handler = new ScanTrackingEventHandler();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return early when fetching integrations fails', async () => {
		mockRepository.findEnabledByUserId.mockRejectedValue(new Error('DB error'));
		const event = new ScanTrackingEvent(mockEventData);

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'analyticsIntegration.fetch.failed',
			expect.anything(),
		);
		expect(mockProviderRegistry.getProvider).not.toHaveBeenCalled();
	});

	it('should return early when no integrations are enabled', async () => {
		mockRepository.findEnabledByUserId.mockResolvedValue([]);
		const event = new ScanTrackingEvent(mockEventData);

		await handler.handle(event);

		expect(mockProviderRegistry.getProvider).not.toHaveBeenCalled();
	});

	it('should decrypt credentials and send event to provider', async () => {
		mockRepository.findEnabledByUserId.mockResolvedValue([mockIntegration]);
		const event = new ScanTrackingEvent(mockEventData);

		await handler.handle(event);

		expect(mockEncryption.decrypt).toHaveBeenCalledWith('encrypted', 'iv', 'tag');
		expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith('google_analytics');
		expect(mockProvider.sendEvent).toHaveBeenCalledWith(
			expect.objectContaining({ url: 'https://example.com', ip: '127.0.0.1' }),
			{ measurementId: 'G-123', apiSecret: 'secret' },
		);
	});

	it('should reset failure counter on successful dispatch when previously failing', async () => {
		const failingIntegration = { ...mockIntegration, consecutiveFailures: 3 };
		mockRepository.findEnabledByUserId.mockResolvedValue([failingIntegration]);
		const event = new ScanTrackingEvent(mockEventData);

		await handler.handle(event);

		expect(mockRepository.recordSuccess).toHaveBeenCalledWith('int-1');
	});

	it('should not reset failure counter when consecutiveFailures is 0', async () => {
		mockRepository.findEnabledByUserId.mockResolvedValue([mockIntegration]);
		const event = new ScanTrackingEvent(mockEventData);

		await handler.handle(event);

		expect(mockRepository.recordSuccess).not.toHaveBeenCalled();
	});

	it('should record failure and log when provider dispatch fails', async () => {
		mockRepository.findEnabledByUserId.mockResolvedValue([mockIntegration]);
		mockProvider.sendEvent.mockRejectedValue(new Error('API timeout'));
		const event = new ScanTrackingEvent(mockEventData);

		await handler.handle(event);

		expect(mockRepository.recordFailure).toHaveBeenCalledWith('int-1', 'API timeout', 10);
		expect(mockLogger.error).toHaveBeenCalledWith(
			'analyticsIntegration.dispatch.failed',
			expect.objectContaining({
				analyticsIntegration: expect.objectContaining({ id: 'int-1' }),
			}),
		);
	});

	it('should log partial failure when some integrations fail', async () => {
		const integration2 = {
			...mockIntegration,
			id: 'int-2',
			providerType: 'matomo' as const,
		};
		mockRepository.findEnabledByUserId.mockResolvedValue([mockIntegration, integration2]);
		mockProvider.sendEvent
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('Matomo down'));
		const event = new ScanTrackingEvent(mockEventData);

		await handler.handle(event);

		expect(mockLogger.error).toHaveBeenCalledWith(
			'analyticsIntegration.dispatch.partialFailure',
			expect.objectContaining({
				analyticsIntegration: expect.objectContaining({ total: 2, failed: 1 }),
			}),
		);
	});
});

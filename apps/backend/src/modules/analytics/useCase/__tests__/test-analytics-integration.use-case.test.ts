import 'reflect-metadata';
import { TestAnalyticsIntegrationUseCase } from '../test-analytics-integration.use-case';
import type AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';
import type { CredentialEncryptionService } from '../../service/credential-encryption.service';
import type { AnalyticsProviderRegistry } from '../../service/providers/analytics-provider.registry';
import type { IAnalyticsProvider } from '../../service/providers/analytics-provider.interface';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TAnalyticsIntegration } from '../../domain/entities/analytics-integration.entity';

describe('TestAnalyticsIntegrationUseCase', () => {
	let useCase: TestAnalyticsIntegrationUseCase;
	let mockRepository: MockProxy<AnalyticsIntegrationRepository>;
	let mockEncryptionService: MockProxy<CredentialEncryptionService>;
	let mockProviderRegistry: MockProxy<AnalyticsProviderRegistry>;
	let mockProvider: MockProxy<IAnalyticsProvider>;
	let mockLogger: MockProxy<Logger>;

	const mockIntegration: TAnalyticsIntegration = {
		id: 'integration-1',
		providerType: 'google_analytics',
		encryptedCredentials: 'encrypted-data',
		encryptionIv: 'iv-value',
		encryptionTag: 'tag-value',
		isEnabled: true,
		lastError: null,
		lastErrorAt: null,
		consecutiveFailures: 0,
		createdBy: 'user-123',
		createdAt: new Date(),
		updatedAt: null,
	};

	const mockCredentials = { measurementId: 'G-TEST123', apiSecret: 'secret' };

	beforeEach(() => {
		mockRepository = mock<AnalyticsIntegrationRepository>();
		mockEncryptionService = mock<CredentialEncryptionService>();
		mockProviderRegistry = mock<AnalyticsProviderRegistry>();
		mockProvider = mock<IAnalyticsProvider>();
		mockLogger = mock<Logger>();

		useCase = new TestAnalyticsIntegrationUseCase(
			mockRepository,
			mockEncryptionService,
			mockProviderRegistry,
			mockLogger,
		);

		mockEncryptionService.decrypt.mockReturnValue(mockCredentials);
		mockProviderRegistry.getProvider.mockReturnValue(mockProvider);
		mockProvider.validateCredentials.mockResolvedValue({
			valid: true,
			credentialsVerified: true,
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return a valid result when credentials are correct', async () => {
		const result = await useCase.execute(mockIntegration);

		expect(result).toEqual({ valid: true, credentialsVerified: true });
	});

	it('should decrypt credentials before testing', async () => {
		await useCase.execute(mockIntegration);

		expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
			mockIntegration.encryptedCredentials,
			mockIntegration.encryptionIv,
			mockIntegration.encryptionTag,
		);
	});

	it('should get the correct provider from registry', async () => {
		await useCase.execute(mockIntegration);

		expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith(mockIntegration.providerType);
	});

	it('should validate credentials via the provider', async () => {
		await useCase.execute(mockIntegration);

		expect(mockProvider.validateCredentials).toHaveBeenCalledWith(mockCredentials);
	});

	it('should log the test result', async () => {
		await useCase.execute(mockIntegration);

		expect(mockLogger.info).toHaveBeenCalledWith('analyticsIntegration.test', {
			analyticsIntegration: {
				id: mockIntegration.id,
				providerType: mockIntegration.providerType,
				valid: true,
				credentialsVerified: true,
			},
		});
	});

	it('should return invalid result when credentials are wrong', async () => {
		mockProvider.validateCredentials.mockResolvedValue({
			valid: false,
			credentialsVerified: false,
		});

		const result = await useCase.execute(mockIntegration);

		expect(result.valid).toBe(false);
		expect(result.credentialsVerified).toBe(false);
	});

	it('should propagate provider errors', async () => {
		mockProvider.validateCredentials.mockRejectedValue(new Error('Provider error'));

		await expect(useCase.execute(mockIntegration)).rejects.toThrow('Provider error');
	});
});

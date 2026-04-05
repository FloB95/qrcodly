import 'reflect-metadata';
import { UpdateAnalyticsIntegrationUseCase } from '../update-analytics-integration.use-case';
import type AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';
import type { CredentialEncryptionService } from '../../service/credential-encryption.service';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TAnalyticsIntegration } from '../../domain/entities/analytics-integration.entity';
import { BadRequestError } from '@/core/error/http';

describe('UpdateAnalyticsIntegrationUseCase', () => {
	let useCase: UpdateAnalyticsIntegrationUseCase;
	let mockRepository: MockProxy<AnalyticsIntegrationRepository>;
	let mockEncryptionService: MockProxy<CredentialEncryptionService>;
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
		consecutiveFailures: 2,
		createdBy: 'user-123',
		createdAt: new Date(),
		updatedAt: null,
	};

	const mockExistingCredentials = { measurementId: 'G-OLD123', apiSecret: 'old-secret' };

	beforeEach(() => {
		mockRepository = mock<AnalyticsIntegrationRepository>();
		mockEncryptionService = mock<CredentialEncryptionService>();
		mockLogger = mock<Logger>();

		useCase = new UpdateAnalyticsIntegrationUseCase(
			mockRepository,
			mockEncryptionService,
			mockLogger,
		);

		mockEncryptionService.decrypt.mockReturnValue(mockExistingCredentials);
		mockEncryptionService.encrypt.mockReturnValue({
			encrypted: 'new-encrypted',
			iv: 'new-iv',
			tag: 'new-tag',
		});
		mockRepository.update.mockResolvedValue(undefined);
		mockRepository.findOneById.mockResolvedValue({ ...mockIntegration });
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should update credentials and reset failure counter', async () => {
		const dto = {
			credentials: { measurementId: 'G-NEW123', apiSecret: 'new-secret' },
		};

		await useCase.execute(mockIntegration, dto);

		expect(mockRepository.update).toHaveBeenCalledWith(
			mockIntegration,
			expect.objectContaining({
				encryptedCredentials: 'new-encrypted',
				consecutiveFailures: 0,
				lastError: null,
				lastErrorAt: null,
			}),
		);
	});

	it('should merge new credentials with existing credentials', async () => {
		const dto = {
			credentials: { measurementId: 'G-UPDATED123' },
		};

		await useCase.execute(mockIntegration, dto);

		expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
			expect.objectContaining({
				measurementId: 'G-UPDATED123',
				apiSecret: 'old-secret',
			}),
		);
	});

	it('should update isEnabled flag', async () => {
		const dto = { isEnabled: false };

		await useCase.execute(mockIntegration, dto);

		expect(mockRepository.update).toHaveBeenCalledWith(
			mockIntegration,
			expect.objectContaining({ isEnabled: false }),
		);
	});

	it('should reset failure counter when re-enabling', async () => {
		const dto = { isEnabled: true };

		await useCase.execute(mockIntegration, dto);

		expect(mockRepository.update).toHaveBeenCalledWith(
			mockIntegration,
			expect.objectContaining({
				isEnabled: true,
				consecutiveFailures: 0,
				lastError: null,
				lastErrorAt: null,
			}),
		);
	});

	it('should log successful update', async () => {
		await useCase.execute(mockIntegration, { isEnabled: false });

		expect(mockLogger.info).toHaveBeenCalledWith('analyticsIntegration.updated', {
			analyticsIntegration: {
				id: mockIntegration.id,
				providerType: mockIntegration.providerType,
			},
		});
	});

	it('should throw when updated integration cannot be retrieved', async () => {
		mockRepository.findOneById.mockResolvedValue(undefined);

		await expect(useCase.execute(mockIntegration, { isEnabled: false })).rejects.toThrow(
			'Failed to update analytics integration',
		);
	});

	it('should throw BadRequestError when merged credentials are invalid', async () => {
		// Simulate invalid merged credentials (e.g., google_analytics without required fields)
		mockEncryptionService.decrypt.mockReturnValue({});

		const dto = { credentials: { measurementId: '' } };

		await expect(
			useCase.execute(mockIntegration, dto),
		).rejects.toThrow(BadRequestError);
	});

	it('should remove keys with empty string values from merged credentials', async () => {
		const dto = { credentials: { apiSecret: '' } };

		await useCase.execute(mockIntegration, dto);

		// apiSecret should be removed (empty string = explicit clear), so merged only has measurementId
		expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
			expect.not.objectContaining({ apiSecret: '' }),
		);
	});
});

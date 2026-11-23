import 'reflect-metadata';
import { DeleteAnalyticsIntegrationUseCase } from '../delete-analytics-integration.use-case';
import type AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TAnalyticsIntegration } from '../../domain/entities/analytics-integration.entity';

describe('DeleteAnalyticsIntegrationUseCase', () => {
	let useCase: DeleteAnalyticsIntegrationUseCase;
	let mockRepository: MockProxy<AnalyticsIntegrationRepository>;
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

	beforeEach(() => {
		mockRepository = mock<AnalyticsIntegrationRepository>();
		mockLogger = mock<Logger>();
		useCase = new DeleteAnalyticsIntegrationUseCase(mockRepository, mockLogger);
		mockRepository.delete.mockResolvedValue(true);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should delete the integration', async () => {
		await useCase.execute(mockIntegration);

		expect(mockRepository.delete).toHaveBeenCalledWith(mockIntegration);
	});

	it('should log the deletion', async () => {
		await useCase.execute(mockIntegration);

		expect(mockLogger.info).toHaveBeenCalledWith('analyticsIntegration.deleted', {
			analyticsIntegration: {
				id: mockIntegration.id,
				providerType: mockIntegration.providerType,
			},
		});
	});

	it('should propagate repository errors', async () => {
		mockRepository.delete.mockRejectedValue(new Error('Database error'));

		await expect(useCase.execute(mockIntegration)).rejects.toThrow('Database error');
	});
});

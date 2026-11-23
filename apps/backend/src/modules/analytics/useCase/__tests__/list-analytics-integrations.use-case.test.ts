import 'reflect-metadata';
import { ListAnalyticsIntegrationsUseCase } from '../list-analytics-integrations.use-case';
import type AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TAnalyticsIntegration } from '../../domain/entities/analytics-integration.entity';

describe('ListAnalyticsIntegrationsUseCase', () => {
	let useCase: ListAnalyticsIntegrationsUseCase;
	let mockRepository: MockProxy<AnalyticsIntegrationRepository>;

	const userId = 'user-123';

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
		createdBy: userId,
		createdAt: new Date(),
		updatedAt: null,
	};

	beforeEach(() => {
		mockRepository = mock<AnalyticsIntegrationRepository>();
		useCase = new ListAnalyticsIntegrationsUseCase(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return all integrations for a user', async () => {
		mockRepository.findAllByUserId.mockResolvedValue([mockIntegration]);

		const result = await useCase.execute(userId);

		expect(result).toEqual([mockIntegration]);
	});

	it('should call repository with userId', async () => {
		mockRepository.findAllByUserId.mockResolvedValue([]);

		await useCase.execute(userId);

		expect(mockRepository.findAllByUserId).toHaveBeenCalledWith(userId);
	});

	it('should return empty array when user has no integrations', async () => {
		mockRepository.findAllByUserId.mockResolvedValue([]);

		const result = await useCase.execute(userId);

		expect(result).toEqual([]);
	});

	it('should return multiple integrations', async () => {
		const integration2: TAnalyticsIntegration = {
			...mockIntegration,
			id: 'integration-2',
			providerType: 'matomo',
		};
		mockRepository.findAllByUserId.mockResolvedValue([mockIntegration, integration2]);

		const result = await useCase.execute(userId);

		expect(result).toHaveLength(2);
	});
});

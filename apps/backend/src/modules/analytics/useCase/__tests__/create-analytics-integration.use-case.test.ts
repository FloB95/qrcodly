import 'reflect-metadata';
import { CreateAnalyticsIntegrationUseCase } from '../create-analytics-integration.use-case';
import type AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';
import type { CredentialEncryptionService } from '../../service/credential-encryption.service';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TAnalyticsIntegration } from '../../domain/entities/analytics-integration.entity';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { PlanName } from '@/core/config/plan.config';

// Mock the policy so it doesn't require full plan config
jest.mock('../../policies/manage-analytics-integration.policy', () => ({
	ManageAnalyticsIntegrationPolicy: jest.fn().mockImplementation(() => ({
		checkAccess: jest.fn().mockReturnValue(true),
	})),
}));

describe('CreateAnalyticsIntegrationUseCase', () => {
	let useCase: CreateAnalyticsIntegrationUseCase;
	let mockRepository: MockProxy<AnalyticsIntegrationRepository>;
	let mockEncryptionService: MockProxy<CredentialEncryptionService>;
	let mockLogger: MockProxy<Logger>;

	const userId = 'user-123';
	const integrationId = 'integration-1';

	const mockUser: TUser = {
		id: userId,
		tokenType: 'session_token',
		plan: PlanName.PRO,
	};

	const mockIntegration: TAnalyticsIntegration = {
		id: integrationId,
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

	const mockDto = {
		providerType: 'google_analytics' as const,
		credentials: { measurementId: 'G-TEST123', apiSecret: 'secret' },
	};

	beforeEach(() => {
		mockRepository = mock<AnalyticsIntegrationRepository>();
		mockEncryptionService = mock<CredentialEncryptionService>();
		mockLogger = mock<Logger>();

		useCase = new CreateAnalyticsIntegrationUseCase(
			mockRepository,
			mockEncryptionService,
			mockLogger,
		);

		mockRepository.findOneByUserId.mockResolvedValue(undefined);
		mockRepository.generateId.mockReturnValue(integrationId);
		mockRepository.create.mockResolvedValue(undefined);
		mockRepository.findOneById.mockResolvedValue(mockIntegration);
		mockEncryptionService.encrypt.mockReturnValue({
			encrypted: 'encrypted-data',
			iv: 'iv-value',
			tag: 'tag-value',
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should create an analytics integration and return it', async () => {
		const result = await useCase.execute(mockDto, mockUser);

		expect(mockRepository.create).toHaveBeenCalled();
		expect(result).toEqual(mockIntegration);
	});

	it('should encrypt credentials before storing', async () => {
		await useCase.execute(mockDto, mockUser);

		expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(mockDto.credentials);
	});

	it('should create integration as enabled by default', async () => {
		await useCase.execute(mockDto, mockUser);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ isEnabled: true }),
		);
	});

	it('should set createdBy to user ID', async () => {
		await useCase.execute(mockDto, mockUser);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ createdBy: userId }),
		);
	});

	it('should store encrypted credentials', async () => {
		await useCase.execute(mockDto, mockUser);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				encryptedCredentials: 'encrypted-data',
				encryptionIv: 'iv-value',
				encryptionTag: 'tag-value',
			}),
		);
	});

	it('should log successful creation', async () => {
		await useCase.execute(mockDto, mockUser);

		expect(mockLogger.info).toHaveBeenCalledWith('analyticsIntegration.created', {
			analyticsIntegration: {
				id: integrationId,
				providerType: mockDto.providerType,
				createdBy: userId,
			},
		});
	});

	it('should throw if integration cannot be retrieved after creation', async () => {
		mockRepository.findOneById.mockResolvedValue(undefined);

		await expect(useCase.execute(mockDto, mockUser)).rejects.toThrow(
			'Failed to create analytics integration',
		);
	});

	it('should enforce plan limits', async () => {
		const { ManageAnalyticsIntegrationPolicy } = jest.requireMock(
			'../../policies/manage-analytics-integration.policy',
		);
		ManageAnalyticsIntegrationPolicy.mockImplementationOnce(() => ({
			checkAccess: jest.fn().mockImplementation(() => {
				throw new PlanLimitExceededError('analytics integration', 0);
			}),
		}));

		await expect(useCase.execute(mockDto, mockUser)).rejects.toThrow(PlanLimitExceededError);
	});
});

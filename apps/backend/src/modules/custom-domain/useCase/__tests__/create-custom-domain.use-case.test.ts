import 'reflect-metadata';
import { CreateCustomDomainUseCase } from '../create-custom-domain.use-case';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TCustomDomain } from '../../domain/entities/custom-domain.entity';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { DomainAlreadyExistsError } from '../../error/http/domain-already-exists.error';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { PlanName } from '@/core/config/plan.config';

jest.mock('../../policies/create-custom-domain.policy', () => ({
	CreateCustomDomainPolicy: jest.fn().mockImplementation(() => ({
		checkAccess: jest.fn().mockResolvedValue(true),
	})),
}));

describe('CreateCustomDomainUseCase', () => {
	let useCase: CreateCustomDomainUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;
	let mockLogger: MockProxy<Logger>;

	const userId = 'user-123';
	const domainId = 'domain-1';

	const mockUser: TUser = {
		id: userId,
		tokenType: 'session_token',
		plan: PlanName.PRO,
	};

	const mockDomain: TCustomDomain = {
		id: domainId,
		domain: 'links.example.com',
		isDefault: false,
		isEnabled: true,
		createdBy: userId,
		createdAt: new Date(),
		updatedAt: null,
		verificationPhase: 'dns_verification',
		ownershipTxtVerified: false,
		cnameVerified: false,
		cloudflareHostnameId: null,
		sslStatus: 'initializing',
		ownershipStatus: 'pending',
		ownershipValidationTxtName: '_qrcodly-verify.links',
		ownershipValidationTxtValue: 'verification-token',
		sslValidationTxtName: null,
		sslValidationTxtValue: null,
		validationErrors: null,
	};

	const mockDto = { domain: 'links.example.com' };

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		mockLogger = mock<Logger>();
		useCase = new CreateCustomDomainUseCase(mockRepository, mockLogger);

		mockRepository.findOneByDomain.mockResolvedValue(undefined);
		mockRepository.countByUserId.mockResolvedValue(0);
		mockRepository.generateId.mockReturnValue(domainId);
		mockRepository.create.mockResolvedValue(undefined);
		mockRepository.findOneById.mockResolvedValue(mockDomain);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should create a custom domain and return it', async () => {
		const result = await useCase.execute(mockDto, mockUser);

		expect(mockRepository.create).toHaveBeenCalled();
		expect(result).toEqual(mockDomain);
	});

	it('should normalize domain to lowercase', async () => {
		await useCase.execute({ domain: 'LINKS.EXAMPLE.COM' }, mockUser);

		expect(mockRepository.findOneByDomain).toHaveBeenCalledWith('links.example.com');
	});

	it('should throw DomainAlreadyExistsError when domain already exists', async () => {
		mockRepository.findOneByDomain.mockResolvedValue(mockDomain);

		await expect(useCase.execute(mockDto, mockUser)).rejects.toThrow(DomainAlreadyExistsError);
	});

	it('should create domain in dns_verification phase', async () => {
		await useCase.execute(mockDto, mockUser);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ verificationPhase: 'dns_verification' }),
		);
	});

	it('should set isDefault to false initially', async () => {
		await useCase.execute(mockDto, mockUser);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ isDefault: false }),
		);
	});

	it('should generate an ownership verification token', async () => {
		await useCase.execute(mockDto, mockUser);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				ownershipValidationTxtValue: expect.any(String),
			}),
		);
	});

	it('should log domain creation', async () => {
		await useCase.execute(mockDto, mockUser);

		expect(mockLogger.info).toHaveBeenCalledWith('customDomain.created', expect.any(Object));
	});

	it('should throw if domain cannot be retrieved after creation', async () => {
		mockRepository.findOneById.mockResolvedValue(undefined);

		await expect(useCase.execute(mockDto, mockUser)).rejects.toThrow(
			'Failed to create Custom Domain',
		);
	});

	it('should enforce plan limits', async () => {
		const { CreateCustomDomainPolicy } = jest.requireMock(
			'../../policies/create-custom-domain.policy',
		);
		CreateCustomDomainPolicy.mockImplementationOnce(() => ({
			checkAccess: jest.fn().mockRejectedValue(new PlanLimitExceededError('custom domain', 0)),
		}));

		await expect(useCase.execute(mockDto, mockUser)).rejects.toThrow(PlanLimitExceededError);
	});
});

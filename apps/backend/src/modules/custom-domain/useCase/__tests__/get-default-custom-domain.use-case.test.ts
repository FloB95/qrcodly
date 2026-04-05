import 'reflect-metadata';
import { GetDefaultCustomDomainUseCase } from '../get-default-custom-domain.use-case';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TCustomDomain } from '../../domain/entities/custom-domain.entity';

describe('GetDefaultCustomDomainUseCase', () => {
	let useCase: GetDefaultCustomDomainUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;

	const userId = 'user-123';

	const mockActiveDomain: TCustomDomain = {
		id: 'domain-1',
		domain: 'links.example.com',
		isDefault: true,
		isEnabled: true,
		createdBy: userId,
		createdAt: new Date(),
		updatedAt: null,
		verificationPhase: 'cloudflare_ssl',
		ownershipTxtVerified: true,
		cnameVerified: true,
		cloudflareHostnameId: 'cf-hostname-1',
		sslStatus: 'active',
		ownershipStatus: 'verified',
		ownershipValidationTxtName: '_qrcodly-verify.links',
		ownershipValidationTxtValue: 'token',
		sslValidationTxtName: null,
		sslValidationTxtValue: null,
		validationErrors: null,
	};

	const mockDisabledDomain: TCustomDomain = {
		...mockActiveDomain,
		isEnabled: false,
	};

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		useCase = new GetDefaultCustomDomainUseCase(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return the default domain when it is enabled', async () => {
		mockRepository.findDefaultByUserId.mockResolvedValue(mockActiveDomain);

		const result = await useCase.execute(userId);

		expect(result).toEqual(mockActiveDomain);
	});

	it('should return undefined when no default domain is set', async () => {
		mockRepository.findDefaultByUserId.mockResolvedValue(undefined);

		const result = await useCase.execute(userId);

		expect(result).toBeUndefined();
	});

	it('should return undefined when default domain is disabled', async () => {
		mockRepository.findDefaultByUserId.mockResolvedValue(mockDisabledDomain);

		const result = await useCase.execute(userId);

		expect(result).toBeUndefined();
	});

	it('should call repository with user ID', async () => {
		mockRepository.findDefaultByUserId.mockResolvedValue(undefined);

		await useCase.execute(userId);

		expect(mockRepository.findDefaultByUserId).toHaveBeenCalledWith(userId);
	});
});

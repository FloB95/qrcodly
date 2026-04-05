import 'reflect-metadata';
import { GetCustomDomainUseCase } from '../get-custom-domain.use-case';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TCustomDomain } from '../../domain/entities/custom-domain.entity';
import { CustomDomainNotFoundError } from '../../error/http/custom-domain-not-found.error';

describe('GetCustomDomainUseCase', () => {
	let useCase: GetCustomDomainUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;

	const mockDomain: TCustomDomain = {
		id: 'domain-1',
		domain: 'links.example.com',
		isDefault: false,
		isEnabled: true,
		createdBy: 'user-123',
		createdAt: new Date(),
		updatedAt: null,
		verificationPhase: 'dns_verification',
		ownershipTxtVerified: false,
		cnameVerified: false,
		cloudflareHostnameId: null,
		sslStatus: 'initializing',
		ownershipStatus: 'pending',
		ownershipValidationTxtName: '_qrcodly-verify.links',
		ownershipValidationTxtValue: 'token',
		sslValidationTxtName: null,
		sslValidationTxtValue: null,
		validationErrors: null,
	};

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		useCase = new GetCustomDomainUseCase(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return the custom domain when found', async () => {
		mockRepository.findOneById.mockResolvedValue(mockDomain);

		const result = await useCase.execute('domain-1');

		expect(result).toEqual(mockDomain);
	});

	it('should call repository with the provided ID', async () => {
		mockRepository.findOneById.mockResolvedValue(mockDomain);

		await useCase.execute('domain-1');

		expect(mockRepository.findOneById).toHaveBeenCalledWith('domain-1');
	});

	it('should throw CustomDomainNotFoundError when domain does not exist', async () => {
		mockRepository.findOneById.mockResolvedValue(undefined);

		await expect(useCase.execute('non-existent')).rejects.toThrow(CustomDomainNotFoundError);
	});
});

import 'reflect-metadata';
import { ResolveCustomDomainUseCase } from '../resolve-custom-domain.use-case';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import type { CustomDomainValidationService } from '../../service/custom-domain-validation.service';
import type ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TCustomDomain } from '../../domain/entities/custom-domain.entity';

describe('ResolveCustomDomainUseCase', () => {
	let useCase: ResolveCustomDomainUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;
	let mockValidationService: MockProxy<CustomDomainValidationService>;
	let mockShortUrlRepository: MockProxy<ShortUrlRepository>;

	const mockValidDomain: TCustomDomain = {
		id: 'domain-1',
		domain: 'links.example.com',
		isDefault: false,
		isEnabled: true,
		createdBy: 'user-123',
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

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		mockValidationService = mock<CustomDomainValidationService>();
		mockShortUrlRepository = mock<ShortUrlRepository>();
		useCase = new ResolveCustomDomainUseCase(
			mockRepository,
			mockValidationService,
			mockShortUrlRepository,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return isValid=true for a valid domain', async () => {
		mockRepository.findOneByDomain.mockResolvedValue(mockValidDomain);
		mockValidationService.isValidForUse.mockReturnValue({ isValid: true });

		const result = await useCase.execute('links.example.com');

		expect(result.isValid).toBe(true);
		expect(result.domain).toBe('links.example.com');
	});

	it('should return isValid=false when domain is not registered', async () => {
		mockRepository.findOneByDomain.mockResolvedValue(undefined);

		const result = await useCase.execute('unknown.example.com');

		expect(result.isValid).toBe(false);
		expect(result.domain).toBe('unknown.example.com');
	});

	it('should return isValid=false when domain fails validation', async () => {
		mockRepository.findOneByDomain.mockResolvedValue(mockValidDomain);
		mockValidationService.isValidForUse.mockReturnValue({
			isValid: false,
			reason: 'SSL certificate not active',
		});

		const result = await useCase.execute('links.example.com');

		expect(result.isValid).toBe(false);
	});

	it('should call validation service with the found domain', async () => {
		mockRepository.findOneByDomain.mockResolvedValue(mockValidDomain);
		mockValidationService.isValidForUse.mockReturnValue({ isValid: true });

		await useCase.execute('links.example.com');

		expect(mockValidationService.isValidForUse).toHaveBeenCalledWith(mockValidDomain);
	});

	it('should not call validation service when domain is not found', async () => {
		mockRepository.findOneByDomain.mockResolvedValue(undefined);

		await useCase.execute('unknown.example.com');

		expect(mockValidationService.isValidForUse).not.toHaveBeenCalled();
	});

	it('should report aliases for a valid domain that has one', async () => {
		mockRepository.findOneByDomain.mockResolvedValue(mockValidDomain);
		mockValidationService.isValidForUse.mockReturnValue({ isValid: true });
		mockShortUrlRepository.hasAliasOnDomain.mockResolvedValue(true);

		const result = await useCase.execute('links.example.com');

		expect(result.hasAliases).toBe(true);
		expect(mockShortUrlRepository.hasAliasOnDomain).toHaveBeenCalledWith(mockValidDomain.id);
	});

	it('should not look for aliases on a domain that is not valid', async () => {
		mockRepository.findOneByDomain.mockResolvedValue(mockValidDomain);
		mockValidationService.isValidForUse.mockReturnValue({ isValid: false, reason: 'disabled' });

		const result = await useCase.execute('links.example.com');

		expect(result.hasAliases).toBe(false);
		expect(mockShortUrlRepository.hasAliasOnDomain).not.toHaveBeenCalled();
	});
});

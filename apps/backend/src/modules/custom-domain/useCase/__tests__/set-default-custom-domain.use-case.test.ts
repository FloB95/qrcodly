import 'reflect-metadata';
import { SetDefaultCustomDomainUseCase } from '../set-default-custom-domain.use-case';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import type { CustomDomainValidationService } from '../../service/custom-domain-validation.service';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TCustomDomain } from '../../domain/entities/custom-domain.entity';
import { BadRequestError } from '@/core/error/http';
import { DomainNotValidForUseError } from '../../error/http/domain-not-valid-for-use.error';

describe('SetDefaultCustomDomainUseCase', () => {
	let useCase: SetDefaultCustomDomainUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;
	let mockValidationService: MockProxy<CustomDomainValidationService>;
	let mockLogger: MockProxy<Logger>;

	const userId = 'user-123';

	const mockVerifiedDomain: TCustomDomain = {
		id: 'domain-1',
		domain: 'links.example.com',
		isDefault: false,
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

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		mockValidationService = mock<CustomDomainValidationService>();
		mockLogger = mock<Logger>();

		useCase = new SetDefaultCustomDomainUseCase(mockRepository, mockValidationService, mockLogger);

		mockValidationService.validateForUse.mockReturnValue(undefined);
		mockRepository.setDefault.mockResolvedValue(undefined);
		mockRepository.findOneById.mockResolvedValue({ ...mockVerifiedDomain, isDefault: true });
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should set the domain as default and return the updated domain', async () => {
		const result = await useCase.execute(mockVerifiedDomain, userId);

		expect(mockRepository.setDefault).toHaveBeenCalledWith(mockVerifiedDomain.id, userId);
		expect(result).toBeDefined();
	});

	it('should throw BadRequestError when domain belongs to another user', async () => {
		await expect(useCase.execute(mockVerifiedDomain, 'other-user')).rejects.toThrow(
			BadRequestError,
		);
	});

	it('should validate that domain is fully verified before setting as default', async () => {
		await useCase.execute(mockVerifiedDomain, userId);

		expect(mockValidationService.validateForUse).toHaveBeenCalledWith(mockVerifiedDomain);
	});

	it('should throw when domain is not fully verified', async () => {
		mockValidationService.validateForUse.mockImplementation(() => {
			throw new DomainNotValidForUseError('links.example.com', 'SSL not active');
		});

		await expect(useCase.execute(mockVerifiedDomain, userId)).rejects.toThrow(
			DomainNotValidForUseError,
		);
	});

	it('should log the action', async () => {
		await useCase.execute(mockVerifiedDomain, userId);

		expect(mockLogger.info).toHaveBeenCalledWith('customDomain.setDefault', expect.any(Object));
	});

	it('should throw when updated domain cannot be retrieved', async () => {
		mockRepository.findOneById.mockResolvedValue(undefined);

		await expect(useCase.execute(mockVerifiedDomain, userId)).rejects.toThrow(
			'Failed to retrieve updated Custom Domain',
		);
	});
});

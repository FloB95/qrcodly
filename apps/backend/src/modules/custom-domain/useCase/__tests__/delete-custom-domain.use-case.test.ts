import 'reflect-metadata';
import { DeleteCustomDomainUseCase } from '../delete-custom-domain.use-case';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import { type CloudflareService } from '../../service/cloudflare.service';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TCustomDomain } from '../../domain/entities/custom-domain.entity';
import { CloudflareApiError } from '../../service/cloudflare.service';

describe('DeleteCustomDomainUseCase', () => {
	let useCase: DeleteCustomDomainUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;
	let mockCloudflareService: MockProxy<CloudflareService>;
	let mockLogger: MockProxy<Logger>;

	const mockDomainWithCloudflare: TCustomDomain = {
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

	const mockDomainWithoutCloudflare: TCustomDomain = {
		...mockDomainWithCloudflare,
		cloudflareHostnameId: null,
		verificationPhase: 'dns_verification',
	};

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		mockCloudflareService = mock<CloudflareService>();
		mockLogger = mock<Logger>();
		useCase = new DeleteCustomDomainUseCase(mockRepository, mockCloudflareService, mockLogger);

		mockCloudflareService.deleteCustomHostname.mockResolvedValue(undefined);
		mockRepository.delete.mockResolvedValue(true);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should delete domain from Cloudflare and database', async () => {
		await useCase.execute(mockDomainWithCloudflare);

		expect(mockCloudflareService.deleteCustomHostname).toHaveBeenCalledWith('cf-hostname-1');
		expect(mockRepository.delete).toHaveBeenCalledWith(mockDomainWithCloudflare);
	});

	it('should skip Cloudflare deletion when no cloudflareHostnameId', async () => {
		await useCase.execute(mockDomainWithoutCloudflare);

		expect(mockCloudflareService.deleteCustomHostname).not.toHaveBeenCalled();
		expect(mockRepository.delete).toHaveBeenCalledWith(mockDomainWithoutCloudflare);
	});

	it('should still delete from database even if Cloudflare deletion fails', async () => {
		mockCloudflareService.deleteCustomHostname.mockRejectedValue(
			new CloudflareApiError('Not found', 404),
		);

		await useCase.execute(mockDomainWithCloudflare);

		expect(mockRepository.delete).toHaveBeenCalledWith(mockDomainWithCloudflare);
	});

	it('should log a warning when Cloudflare deletion fails', async () => {
		mockCloudflareService.deleteCustomHostname.mockRejectedValue(
			new CloudflareApiError('Not found', 404),
		);

		await useCase.execute(mockDomainWithCloudflare);

		expect(mockLogger.warn).toHaveBeenCalledWith(
			'customDomain.cloudflare.delete.failed',
			expect.any(Object),
		);
	});

	it('should log domain deletion', async () => {
		await useCase.execute(mockDomainWithCloudflare);

		expect(mockLogger.info).toHaveBeenCalledWith('customDomain.deleted', {
			customDomain: {
				id: mockDomainWithCloudflare.id,
				domain: mockDomainWithCloudflare.domain,
				createdBy: mockDomainWithCloudflare.createdBy,
			},
		});
	});

	it('should propagate non-Cloudflare repository errors', async () => {
		mockRepository.delete.mockRejectedValue(new Error('Database error'));

		await expect(useCase.execute(mockDomainWithoutCloudflare)).rejects.toThrow('Database error');
	});
});

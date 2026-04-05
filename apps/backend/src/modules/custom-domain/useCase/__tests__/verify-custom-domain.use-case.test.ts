import 'reflect-metadata';
import { VerifyCustomDomainUseCase } from '../verify-custom-domain.use-case';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import type { CloudflareService } from '../../service/cloudflare.service';
import type { DnsVerificationService } from '../../service/dns-verification.service';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TCustomDomain } from '../../domain/entities/custom-domain.entity';
import { BadRequestError } from '@/core/error/http';
import { CloudflareApiError } from '../../service/cloudflare.service';

describe('VerifyCustomDomainUseCase', () => {
	let useCase: VerifyCustomDomainUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;
	let mockCloudflareService: MockProxy<CloudflareService>;
	let mockDnsVerificationService: MockProxy<DnsVerificationService>;
	let mockLogger: MockProxy<Logger>;

	const baseDomain: TCustomDomain = {
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
		ownershipValidationTxtValue: 'verify-token-123',
		sslValidationTxtName: null,
		sslValidationTxtValue: null,
		validationErrors: null,
	};

	const cloudflarePhaseDomain: TCustomDomain = {
		...baseDomain,
		verificationPhase: 'cloudflare_ssl',
		ownershipTxtVerified: true,
		cnameVerified: true,
		cloudflareHostnameId: 'cf-hostname-1',
		sslStatus: 'pending_validation',
		ownershipStatus: 'verified',
	};

	const activeDomain: TCustomDomain = {
		...cloudflarePhaseDomain,
		sslStatus: 'active',
	};

	const mockCloudflareHostname = {
		id: 'cf-hostname-1',
		hostname: 'links.example.com',
		ssl: {
			status: 'pending_validation' as const,
			method: 'txt' as const,
			type: 'dv' as const,
			validation_records: [
				{
					txt_name: '_dnsauth.links.example.com',
					txt_value: 'ssl-token-456',
				},
			],
		},
		status: 'pending' as const,
		created_at: new Date().toISOString(),
	};

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		mockCloudflareService = mock<CloudflareService>();
		mockDnsVerificationService = mock<DnsVerificationService>();
		mockLogger = mock<Logger>();

		useCase = new VerifyCustomDomainUseCase(
			mockRepository,
			mockCloudflareService,
			mockDnsVerificationService,
			mockLogger,
		);

		mockRepository.update.mockResolvedValue(undefined);
		mockRepository.findOneById.mockResolvedValue(baseDomain);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Phase 1: DNS verification', () => {
		it('should return domain as-is when DNS records are not verified yet', async () => {
			mockDnsVerificationService.verifyDnsRecords.mockResolvedValue({
				ownershipTxtVerified: false,
				cnameVerified: false,
			});

			const result = await useCase.execute(baseDomain);

			expect(result).toBeDefined();
			expect(mockCloudflareService.createCustomHostname).not.toHaveBeenCalled();
		});

		it('should update verification flags after DNS check', async () => {
			mockDnsVerificationService.verifyDnsRecords.mockResolvedValue({
				ownershipTxtVerified: true,
				cnameVerified: false,
			});
			mockRepository.findOneById.mockResolvedValue({
				...baseDomain,
				ownershipTxtVerified: true,
			});

			await useCase.execute(baseDomain);

			expect(mockRepository.update).toHaveBeenCalledWith(
				baseDomain,
				expect.objectContaining({
					ownershipTxtVerified: true,
					cnameVerified: false,
				}),
			);
		});

		it('should transition to Cloudflare phase when both DNS records are verified', async () => {
			mockDnsVerificationService.verifyDnsRecords.mockResolvedValue({
				ownershipTxtVerified: true,
				cnameVerified: true,
			});
			mockCloudflareService.createCustomHostname.mockResolvedValue(mockCloudflareHostname);
			mockRepository.findOneById.mockResolvedValue(cloudflarePhaseDomain);

			await useCase.execute(baseDomain);

			expect(mockCloudflareService.createCustomHostname).toHaveBeenCalledWith(baseDomain.domain);
		});

		it('should throw BadRequestError when domain has no verification token', async () => {
			const noTokenDomain = { ...baseDomain, ownershipValidationTxtValue: null };

			await expect(useCase.execute(noTokenDomain)).rejects.toThrow(BadRequestError);
		});
	});

	describe('Phase 2: Cloudflare SSL verification', () => {
		it('should return domain as-is when already active', async () => {
			const result = await useCase.execute(activeDomain);

			expect(result).toEqual(activeDomain);
			expect(mockCloudflareService.getCustomHostname).not.toHaveBeenCalled();
		});

		it('should poll Cloudflare and update SSL status', async () => {
			mockCloudflareService.getCustomHostname.mockResolvedValue(mockCloudflareHostname);
			mockRepository.findOneById.mockResolvedValue(cloudflarePhaseDomain);

			await useCase.execute(cloudflarePhaseDomain);

			expect(mockCloudflareService.getCustomHostname).toHaveBeenCalledWith('cf-hostname-1');
			expect(mockRepository.update).toHaveBeenCalledWith(
				cloudflarePhaseDomain,
				expect.objectContaining({ sslStatus: 'pending_validation' }),
			);
		});

		it('should throw BadRequestError when cloudflareHostnameId is missing in Phase 2', async () => {
			const noHostnameIdDomain = {
				...cloudflarePhaseDomain,
				cloudflareHostnameId: null,
			};

			await expect(useCase.execute(noHostnameIdDomain)).rejects.toThrow(BadRequestError);
		});

		it('should handle Cloudflare API errors gracefully in Phase 2', async () => {
			mockCloudflareService.getCustomHostname.mockRejectedValue(
				new CloudflareApiError('Service unavailable', 503),
			);

			await expect(useCase.execute(cloudflarePhaseDomain)).rejects.toThrow();
		});
	});

	describe('Already active domain', () => {
		it('should return domain immediately if SSL is already active', async () => {
			const result = await useCase.execute(activeDomain);

			expect(result).toEqual(activeDomain);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});
	});
});

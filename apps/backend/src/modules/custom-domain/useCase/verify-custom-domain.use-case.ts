import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import {
	TCustomDomain,
	TOwnershipStatus,
	TVerificationPhase,
} from '../domain/entities/custom-domain.entity';
import {
	CloudflareService,
	CloudflareApiError,
	ICloudflareCustomHostname,
} from '../service/cloudflare.service';
import { DnsVerificationService } from '../service/dns-verification.service';
import { DomainVerificationFailedError } from '../error/http/domain-verification-failed.error';
import { BadRequestError } from '@/core/error/http';

/**
 * Use case for verifying a Custom Domain through the two-phase verification process.
 *
 * Phase 1 (dns_verification): Verify ownership TXT and CNAME records via DNS lookup.
 * Phase 2 (cloudflare_ssl): Poll Cloudflare for SSL certificate status.
 */
@injectable()
export class VerifyCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(CloudflareService) private cloudflareService: CloudflareService,
		@inject(DnsVerificationService) private dnsVerificationService: DnsVerificationService,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Maps Cloudflare hostname status to local ownership status.
	 */
	private mapOwnershipStatus(cloudflareHostname: ICloudflareCustomHostname): TOwnershipStatus {
		return cloudflareHostname.status === 'active' ? 'verified' : 'pending';
	}

	/**
	 * Phase 1: Verify DNS records (ownership TXT + CNAME).
	 * If both are verified, register with Cloudflare and transition to Phase 2.
	 */
	private async verifyDnsPhase(customDomain: TCustomDomain): Promise<TCustomDomain> {
		if (!customDomain.ownershipValidationTxtValue) {
			throw new BadRequestError('Domain missing verification token');
		}

		this.logger.info('customDomain.verification.dns.start', {
			customDomainId: customDomain.id,
			domain: customDomain.domain,
		});

		// Verify DNS records using ownershipValidationTxtValue as the verification token
		const dnsResult = await this.dnsVerificationService.verifyDnsRecords(
			customDomain.domain,
			customDomain.ownershipValidationTxtValue,
		);

		// Update verified flags
		await this.customDomainRepository.update(customDomain, {
			ownershipTxtVerified: dnsResult.ownershipTxtVerified,
			cnameVerified: dnsResult.cnameVerified,
		});

		this.logger.info('customDomain.verification.dns.result', {
			customDomainId: customDomain.id,
			domain: customDomain.domain,
			ownershipTxtVerified: dnsResult.ownershipTxtVerified,
			cnameVerified: dnsResult.cnameVerified,
		});

		// If both DNS records are verified, transition to Cloudflare phase
		if (dnsResult.ownershipTxtVerified && dnsResult.cnameVerified) {
			return this.transitionToCloudflarePhase(customDomain);
		}

		// Return updated domain (still in dns_verification phase)
		const updatedDomain = await this.customDomainRepository.findOneById(customDomain.id);
		if (!updatedDomain) throw new Error('Failed to retrieve updated Custom Domain');
		return updatedDomain;
	}

	/**
	 * Transitions from DNS verification to Cloudflare SSL phase.
	 * Registers the domain with Cloudflare Custom Hostnames API.
	 */
	private async transitionToCloudflarePhase(customDomain: TCustomDomain): Promise<TCustomDomain> {
		this.logger.info('customDomain.verification.transition_to_cloudflare', {
			customDomainId: customDomain.id,
			domain: customDomain.domain,
		});

		// Register with Cloudflare
		let cloudflareHostname: ICloudflareCustomHostname;
		try {
			cloudflareHostname = await this.cloudflareService.createCustomHostname(customDomain.domain);
		} catch (error) {
			if (error instanceof CloudflareApiError) {
				this.logger.error('customDomain.cloudflare.create.failed', {
					domain: customDomain.domain,
					error: error.message,
					statusCode: error.statusCode,
				});
				throw new DomainVerificationFailedError(
					customDomain.domain,
					`Failed to register domain with Cloudflare: ${error.message}`,
				);
			}
			throw error;
		}

		// Extract SSL validation records from Cloudflare
		const sslValidationRecord = cloudflareHostname.ssl.validation_records?.[0];

		// Update domain to Phase 2
		await this.customDomainRepository.update(customDomain, {
			verificationPhase: 'cloudflare_ssl' as TVerificationPhase,
			ownershipStatus: 'verified',
			cloudflareHostnameId: cloudflareHostname.id,
			sslStatus: cloudflareHostname.ssl.status,
			sslValidationTxtName: sslValidationRecord?.txt_name ?? null,
			sslValidationTxtValue: sslValidationRecord?.txt_value ?? null,
		});

		this.logger.info('customDomain.verification.cloudflare_registered', {
			customDomainId: customDomain.id,
			domain: customDomain.domain,
			cloudflareHostnameId: cloudflareHostname.id,
			sslStatus: cloudflareHostname.ssl.status,
		});

		const updatedDomain = await this.customDomainRepository.findOneById(customDomain.id);
		if (!updatedDomain) throw new Error('Failed to retrieve updated Custom Domain');
		return updatedDomain;
	}

	/**
	 * Phase 2: Poll Cloudflare for SSL certificate status.
	 */
	private async verifyCloudflarePhase(customDomain: TCustomDomain): Promise<TCustomDomain> {
		// If already fully verified (SSL active), return as-is
		if (customDomain.sslStatus === 'active') {
			this.logger.info('customDomain.verification.already_active', {
				customDomainId: customDomain.id,
				domain: customDomain.domain,
			});
			return customDomain;
		}

		// Check if we have a Cloudflare hostname ID
		if (!customDomain.cloudflareHostnameId) {
			throw new BadRequestError('Domain not registered with Cloudflare');
		}

		// Poll Cloudflare for current status
		let cloudflareHostname: ICloudflareCustomHostname;
		try {
			cloudflareHostname = await this.cloudflareService.getCustomHostname(
				customDomain.cloudflareHostnameId,
			);
		} catch (error) {
			if (error instanceof CloudflareApiError) {
				this.logger.error('customDomain.cloudflare.verify.failed', {
					domain: customDomain.domain,
					error: error.message,
					statusCode: error.statusCode,
				});
				throw new DomainVerificationFailedError(
					customDomain.domain,
					`Failed to check domain status: ${error.message}`,
				);
			}
			throw error;
		}

		// Extract updated validation records (they may change)
		const sslValidationRecord = cloudflareHostname.ssl.validation_records?.[0];

		// Map Cloudflare status to local status
		const sslStatus = cloudflareHostname.ssl.status;
		const ownershipStatus = this.mapOwnershipStatus(cloudflareHostname);

		// Extract validation errors from Cloudflare response
		const validationErrors = cloudflareHostname.ssl.validation_errors?.map((e) => e.message) ?? [];
		if (validationErrors.length > 0) {
			this.logger.warn('customDomain.cloudflare.validation_errors', {
				domain: customDomain.domain,
				errors: validationErrors,
			});
		}

		// Update the domain with new status from Cloudflare
		await this.customDomainRepository.update(customDomain, {
			sslStatus,
			ownershipStatus,
			sslValidationTxtName: sslValidationRecord?.txt_name ?? customDomain.sslValidationTxtName,
			sslValidationTxtValue: sslValidationRecord?.txt_value ?? customDomain.sslValidationTxtValue,
			validationErrors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
		});

		// Retrieve the updated Custom Domain entity
		const updatedCustomDomain = await this.customDomainRepository.findOneById(customDomain.id);
		if (!updatedCustomDomain) throw new Error('Failed to retrieve updated Custom Domain');

		this.logger.info('customDomain.verified', {
			customDomain: {
				id: updatedCustomDomain.id,
				domain: updatedCustomDomain.domain,
				sslStatus,
				ownershipStatus,
				cloudflareStatus: cloudflareHostname.status,
			},
		});

		return updatedCustomDomain;
	}

	/**
	 * Executes the use case to verify a Custom Domain.
	 * Routes to the appropriate phase-specific verification logic.
	 * @param customDomain The Custom Domain to verify.
	 * @returns A promise that resolves with the updated Custom Domain entity.
	 */
	async execute(customDomain: TCustomDomain): Promise<TCustomDomain> {
		// If already fully verified (SSL active), return as-is
		if (customDomain.sslStatus === 'active') {
			this.logger.info('customDomain.verification.already_active', {
				customDomainId: customDomain.id,
				domain: customDomain.domain,
			});
			return customDomain;
		}

		// Route to appropriate phase
		if (customDomain.verificationPhase === 'dns_verification') {
			return this.verifyDnsPhase(customDomain);
		}

		if (customDomain.verificationPhase === 'cloudflare_ssl') {
			return this.verifyCloudflarePhase(customDomain);
		}

		// Default to DNS phase for domains without a phase set (shouldn't happen)
		this.logger.warn('customDomain.verification.unknown_phase', {
			customDomainId: customDomain.id,
			domain: customDomain.domain,
			verificationPhase: customDomain.verificationPhase,
		});
		return this.verifyDnsPhase(customDomain);
	}
}

import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import {
	TCustomDomain,
	TCloudflareSSLStatus,
	TOwnershipStatus,
} from '../domain/entities/custom-domain.entity';
import {
	CloudflareService,
	CloudflareApiError,
	ICloudflareCustomHostname,
} from '../service/cloudflare.service';
import { DomainVerificationFailedError } from '../error/http/domain-verification-failed.error';
import { BadRequestError } from '@/core/error/http';

/**
 * Use case for verifying a Custom Domain by polling Cloudflare status.
 */
@injectable()
export class VerifyCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(CloudflareService) private cloudflareService: CloudflareService,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Maps Cloudflare hostname status to local ownership status.
	 */
	private mapOwnershipStatus(cloudflareHostname: ICloudflareCustomHostname): TOwnershipStatus {
		return cloudflareHostname.status === 'active' ? 'verified' : 'pending';
	}

	/**
	 * Executes the use case to verify a Custom Domain by polling Cloudflare.
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
		const ownershipVerification = cloudflareHostname.ownership_verification;

		// Map Cloudflare status to local status
		const sslStatus = cloudflareHostname.ssl.status as TCloudflareSSLStatus;
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
			ownershipValidationTxtName:
				ownershipVerification?.name ?? customDomain.ownershipValidationTxtName,
			ownershipValidationTxtValue:
				ownershipVerification?.value ?? customDomain.ownershipValidationTxtValue,
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
}

import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { type TCreateCustomDomainDto } from '@shared/schemas';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { CreateCustomDomainPolicy } from '../policies/create-custom-domain.policy';
import { DomainAlreadyExistsError } from '../error/http/domain-already-exists.error';
import { CloudflareService, CloudflareApiError } from '../service/cloudflare.service';
import { BadRequestError } from '@/core/error/http';

/**
 * Use case for creating a Custom Domain entity.
 * Registers the domain with Cloudflare Custom Hostnames API.
 */
@injectable()
export class CreateCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(CloudflareService) private cloudflareService: CloudflareService,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Executes the use case to create a new Custom Domain entity.
	 * @param dto The data transfer object containing the domain to be added.
	 * @param user The authenticated user.
	 * @returns A promise that resolves with the newly created Custom Domain entity.
	 */
	async execute(dto: TCreateCustomDomainDto, user: TUser): Promise<TCustomDomain> {
		const domain = dto.domain.toLowerCase();

		// Check if domain already exists
		const existingDomain = await this.customDomainRepository.findOneByDomain(domain);
		if (existingDomain) {
			throw new DomainAlreadyExistsError(domain);
		}

		// Check plan limits
		const currentDomainCount = await this.customDomainRepository.countByUserId(user.id);

		const policy = new CreateCustomDomainPolicy(user, currentDomainCount);
		await policy.checkAccess();

		// Register with Cloudflare Custom Hostnames
		let cloudflareHostname;
		try {
			cloudflareHostname = await this.cloudflareService.createCustomHostname(domain);
		} catch (error) {
			if (error instanceof CloudflareApiError) {
				this.logger.error('customDomain.cloudflare.create.failed', {
					domain,
					error: error.message,
					statusCode: error.statusCode,
				});
				throw new BadRequestError(`Failed to register domain with Cloudflare: ${error.message}`);
			}
			throw error;
		}

		// Extract validation records from Cloudflare response
		const sslValidationRecord = cloudflareHostname.ssl.validation_records?.[0];
		const ownershipVerification = cloudflareHostname.ownership_verification;

		// Extract validation errors from Cloudflare response
		const validationErrors = cloudflareHostname.ssl.validation_errors?.map((e) => e.message) ?? [];
		if (validationErrors.length > 0) {
			this.logger.warn('customDomain.cloudflare.validationErrors', {
				domain,
				validationErrors,
			});
		}

		// Generate ID for new domain
		const newId = await this.customDomainRepository.generateId();

		const customDomain: Omit<TCustomDomain, 'createdAt' | 'updatedAt'> = {
			id: newId,
			domain,
			isDefault: false,
			isEnabled: true,
			createdBy: user.id,
			// Cloudflare fields
			cloudflareHostnameId: cloudflareHostname.id,
			sslStatus: cloudflareHostname.ssl.status,
			ownershipStatus: cloudflareHostname.status === 'active' ? 'verified' : 'pending',
			sslValidationTxtName: sslValidationRecord?.txt_name ?? null,
			sslValidationTxtValue: sslValidationRecord?.txt_value ?? null,
			ownershipValidationTxtName: ownershipVerification?.name ?? null,
			ownershipValidationTxtValue: ownershipVerification?.value ?? null,
			validationErrors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
		};

		// Create the Custom Domain entity in the database
		await this.customDomainRepository.create(customDomain);

		// Retrieve the created Custom Domain entity
		const createdCustomDomain = await this.customDomainRepository.findOneById(newId);
		if (!createdCustomDomain) throw new Error('Failed to create Custom Domain');

		this.logger.info('customDomain.created', {
			customDomain: {
				id: createdCustomDomain.id,
				domain: createdCustomDomain.domain,
				createdBy: createdCustomDomain.createdBy,
				cloudflareHostnameId: cloudflareHostname.id,
				sslStatus: cloudflareHostname.ssl.status,
			},
		});

		return createdCustomDomain;
	}
}

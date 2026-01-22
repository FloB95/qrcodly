import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { randomUUID } from 'crypto';
import { Logger } from '@/core/logging';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { type TCreateCustomDomainDto } from '@shared/schemas';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { CreateCustomDomainPolicy } from '../policies/create-custom-domain.policy';
import { DomainAlreadyExistsError } from '../error/http/domain-already-exists.error';

/**
 * Use case for creating a Custom Domain entity.
 * Creates the domain in Phase 1 (dns_verification) - user must verify DNS records
 * before the domain is registered with Cloudflare.
 */
@injectable()
export class CreateCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Executes the use case to create a new Custom Domain entity.
	 * The domain starts in dns_verification phase - user must add TXT and CNAME records.
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

		// Generate ID and verification token for new domain
		const newId = await this.customDomainRepository.generateId();
		const verificationToken = randomUUID();

		// Extract subdomain for TXT record display (e.g., "links" from "links.example.com")
		// DNS providers typically want just the host part, not the full domain
		const domainParts = domain.split('.');
		const subdomain = domainParts.slice(0, -2).join('.');

		// Create domain in Phase 1 (dns_verification)
		// User must add TXT record (_qrcodly-verify.{subdomain}) and CNAME record
		// before we register with Cloudflare
		const customDomain: Omit<TCustomDomain, 'createdAt' | 'updatedAt'> = {
			id: newId,
			domain,
			isDefault: false,
			isEnabled: true,
			createdBy: user.id,
			// Phase 1: DNS verification
			verificationPhase: 'dns_verification',
			ownershipTxtVerified: false,
			cnameVerified: false,
			// Cloudflare fields - not registered yet
			cloudflareHostnameId: null,
			sslStatus: 'initializing',
			ownershipStatus: 'pending',
			// Ownership validation record (our own TXT record for DNS verification)
			// Store just the subdomain part for display (DNS providers auto-append the domain)
			ownershipValidationTxtName: `_qrcodly-verify.${subdomain}`,
			ownershipValidationTxtValue: verificationToken,
			// SSL validation records - not available until Cloudflare registration
			sslValidationTxtName: null,
			sslValidationTxtValue: null,
			validationErrors: null,
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
				verificationPhase: 'dns_verification',
			},
		});

		return createdCustomDomain;
	}
}

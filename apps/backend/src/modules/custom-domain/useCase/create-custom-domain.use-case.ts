import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { type TCreateCustomDomainDto } from '@shared/schemas';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { CreateCustomDomainPolicy } from '../policies/create-custom-domain.policy';
import { DomainAlreadyExistsError } from '../error/http/domain-already-exists.error';

/**
 * Use case for creating a Custom Domain entity.
 */
@injectable()
export class CreateCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Executes the use case to create a new Custom Domain entity.
	 * @param dto The data transfer object containing the domain to be added.
	 * @param user The authenticated user.
	 * @returns A promise that resolves with the newly created Custom Domain entity.
	 */
	async execute(dto: TCreateCustomDomainDto, user: TUser): Promise<TCustomDomain> {
		// Check if domain already exists
		const existingDomain = await this.customDomainRepository.findOneByDomain(dto.domain);
		if (existingDomain) {
			throw new DomainAlreadyExistsError(dto.domain);
		}

		// Check plan limits
		const currentDomainCount = await this.customDomainRepository.countByUserId(user.id);
		const policy = new CreateCustomDomainPolicy(user, currentDomainCount);
		await policy.checkAccess();

		// Generate IDs and verification token
		const newId = await this.customDomainRepository.generateId();
		const verificationToken = this.customDomainRepository.generateVerificationToken();

		const customDomain: Omit<TCustomDomain, 'createdAt' | 'updatedAt'> = {
			id: newId,
			domain: dto.domain.toLowerCase(),
			isVerified: false,
			isCnameValid: false,
			isDefault: false,
			verificationToken,
			createdBy: user.id,
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
			},
		});

		return createdCustomDomain;
	}
}

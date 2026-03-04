import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';

/**
 * Use case for getting the user's default Custom Domain.
 */
@injectable()
export class GetDefaultCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
	) {}

	/**
	 * Gets the user's default custom domain.
	 * Returns undefined if no default is set or if the default domain is disabled.
	 * @param userId The user ID.
	 * @returns The default custom domain or undefined if none is set or domain is disabled.
	 */
	async execute(userId: string): Promise<TCustomDomain | undefined> {
		const domain = await this.customDomainRepository.findDefaultByUserId(userId);
		if (domain && !domain.isEnabled) return undefined;
		return domain;
	}
}

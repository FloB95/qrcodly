import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';

/**
 * Use case for clearing the user's default custom domain.
 */
@injectable()
export class ClearDefaultCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Clears the user's default domain setting.
	 * After clearing, dynamic QR codes will use the system's default domain.
	 * @param userId The ID of the user.
	 */
	async execute(userId: string): Promise<void> {
		await this.customDomainRepository.clearDefault(userId);

		this.logger.info('customDomain.clearDefault', { customDomain: { userId } });
	}
}

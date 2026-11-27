import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { ForbiddenError } from '@/core/error/http';
import { type TShortUrlAliasAvailabilityResponseDto } from '@shared/schemas';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { CustomDomainNotFoundError } from '@/modules/custom-domain/error';
import { ShortUrlAliasService } from '../service/short-url-alias.service';

/** Tells the owner of a custom domain whether an alias is still free on it, before they save. */
@injectable()
export class CheckShortUrlAliasAvailabilityUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(ShortUrlAliasService) private shortUrlAliasService: ShortUrlAliasService,
	) {}

	async execute(
		customDomainId: string,
		alias: string,
		userId: string,
	): Promise<TShortUrlAliasAvailabilityResponseDto> {
		const customDomain = await this.customDomainRepository.findOneById(customDomainId);
		if (!customDomain) throw new CustomDomainNotFoundError();
		if (customDomain.createdBy !== userId) {
			throw new ForbiddenError('You do not own this custom domain.');
		}

		const conflict = await this.shortUrlAliasService.findConflict(customDomainId, alias);
		return { available: conflict === null, conflict };
	}
}

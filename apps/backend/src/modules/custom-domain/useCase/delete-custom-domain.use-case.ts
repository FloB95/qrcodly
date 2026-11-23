import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { CloudflareService, CloudflareApiError } from '../service/cloudflare.service';
import { EventEmitter } from '@/core/event';
import { CustomDomainDeletedEvent } from '../event/custom-domain-deleted.event';

/**
 * Use case for deleting a Custom Domain.
 * Also removes the hostname from Cloudflare.
 */
@injectable()
export class DeleteCustomDomainUseCase implements IBaseUseCase {
	constructor(
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
		@inject(CloudflareService) private cloudflareService: CloudflareService,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
	) {}

	/**
	 * Executes the use case to delete a Custom Domain.
	 * Note: Short URLs using this domain will have their customDomainId set to null (cascade behavior).
	 * @param customDomain The Custom Domain to delete.
	 * @returns A promise that resolves when the domain is deleted.
	 */
	async execute(customDomain: TCustomDomain): Promise<void> {
		// Delete from Cloudflare if we have a hostname ID
		if (customDomain.cloudflareHostnameId) {
			try {
				await this.cloudflareService.deleteCustomHostname(customDomain.cloudflareHostnameId);
				this.logger.info('customDomain.cloudflare.deleted', {
					customDomain: {
						cloudflareHostnameId: customDomain.cloudflareHostnameId,
						domain: customDomain.domain,
					},
				});
			} catch (error) {
				// already gone at Cloudflare: finish the deletion in our database
				if (error instanceof CloudflareApiError && error.statusCode === 404) {
					this.logger.warn('customDomain.cloudflare.delete.failed', {
						customDomain: {
							cloudflareHostnameId: customDomain.cloudflareHostnameId,
							domain: customDomain.domain,
						},
						error: error.message,
						statusCode: error.statusCode,
					});
				} else {
					// keep the row, otherwise nothing can find and retry the hostname left at Cloudflare
					this.logger.error('customDomain.cloudflare.delete.error', {
						customDomain: {
							cloudflareHostnameId: customDomain.cloudflareHostnameId,
							domain: customDomain.domain,
						},
						error,
					});
					throw error;
				}
			}
		}

		// Delete from database
		await this.customDomainRepository.delete(customDomain);
		this.eventEmitter.emit(new CustomDomainDeletedEvent(customDomain));

		this.logger.info('customDomain.deleted', {
			customDomain: {
				id: customDomain.id,
				domain: customDomain.domain,
				createdBy: customDomain.createdBy,
			},
		});
	}
}

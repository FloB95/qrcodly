import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { Logger } from '@/core/logging';
import { CustomDomainDeletedEvent } from '@/modules/custom-domain/event/custom-domain-deleted.event';
import { HostedPageCacheService } from '../../service/hosted-page-cache.service';

/** Cached pages carry their address, which may have been on the removed domain. */
@EventHandler(CustomDomainDeletedEvent.eventName)
export class DropCachedPagesOnCustomDomainDeletedEventHandler extends AbstractEventHandler<CustomDomainDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: CustomDomainDeletedEvent): Promise<void> {
		try {
			await container.resolve(HostedPageCacheService).invalidateUser(event.customDomain.createdBy);
		} catch (error) {
			container.resolve(Logger).error('hostedPage.cache.invalidate.failed', {
				error: error as Error,
				userId: event.customDomain.createdBy,
			});
		}
	}
}

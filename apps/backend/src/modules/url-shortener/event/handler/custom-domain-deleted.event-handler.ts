import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { Logger } from '@/core/logging';
import { CustomDomainDeletedEvent } from '@/modules/custom-domain/event/custom-domain-deleted.event';
import ShortUrlRepository from '../../domain/repository/short-url.repository';

/** An alias only exists on a custom domain, so the links of a removed domain lose theirs. */
@EventHandler(CustomDomainDeletedEvent.eventName)
export class ClearAliasesOnCustomDomainDeletedEventHandler extends AbstractEventHandler<CustomDomainDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: CustomDomainDeletedEvent): Promise<void> {
		try {
			await container.resolve(ShortUrlRepository).clearAliasesWithoutDomain();
		} catch (error) {
			container.resolve(Logger).error('shortUrl.alias.clear.failed', {
				error: error as Error,
				customDomainId: event.customDomain.id,
			});
		}
	}
}

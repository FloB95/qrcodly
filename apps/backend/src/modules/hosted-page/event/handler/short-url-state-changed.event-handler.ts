import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { Logger } from '@/core/logging';
import { ShortUrlStateChangedEvent } from '@/modules/url-shortener/event/short-url-state-changed.event';
import { HostedPageCacheService } from '../../service/hosted-page-cache.service';

/** A cached page must follow its link at once: switched off, blocked, on another domain. */
@EventHandler(ShortUrlStateChangedEvent.eventName)
export class DropCachedPageOnShortUrlStateChangedEventHandler extends AbstractEventHandler<ShortUrlStateChangedEvent> {
	constructor() {
		super();
	}

	async handle({ shortUrl }: ShortUrlStateChangedEvent): Promise<void> {
		if (!shortUrl.hostedPageId) return;
		try {
			await container.resolve(HostedPageCacheService).invalidateShortCode(shortUrl.shortCode);
		} catch (error) {
			container.resolve(Logger).error('hostedPage.cache.invalidate.failed', {
				error: error as Error,
				shortCode: shortUrl.shortCode,
			});
		}
	}
}

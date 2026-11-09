import { AbstractEvent } from '@/core/event/abstract.event';
import { type TShortUrl } from '../domain/entities/short-url.entity';

/**
 * What a scan of a short URL leads to may have changed: switched on or off, blocked or unblocked,
 * moved to another domain. Modules that cache what a link serves drop it.
 */
export class ShortUrlStateChangedEvent extends AbstractEvent {
	static readonly eventName = 'ShortUrlStateChanged';

	constructor(public readonly shortUrl: Pick<TShortUrl, 'id' | 'shortCode' | 'hostedPageId'>) {
		super();
	}

	eventName(): string {
		return ShortUrlStateChangedEvent.eventName;
	}
}

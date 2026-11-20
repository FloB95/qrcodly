import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { Logger } from '@/core/logging';
import { ShortUrlScannedEvent } from '@/modules/url-shortener/event/short-url-scanned.event';
import { ForwardScanUseCase } from '../../useCase/forward-scan.use-case';

@EventHandler(ShortUrlScannedEvent.eventName)
export class ForwardScanOnShortUrlScannedEventHandler extends AbstractEventHandler<ShortUrlScannedEvent> {
	constructor() {
		super();
	}

	async handle({ shortCode, ownerId, scan }: ShortUrlScannedEvent): Promise<void> {
		try {
			container.resolve(ForwardScanUseCase).execute(shortCode, ownerId, scan);
		} catch (error) {
			container.resolve(Logger).error('analytics.scan.forward.failed', {
				error: error as Error,
				shortCode,
			});
		}
	}
}

import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserBannedEvent } from '@/core/event/user-banned.event';
import { Logger } from '@/core/logging';
import { NewsletterSyncService } from '../../service/newsletter-sync.service';

/** Clerk dashboard bans arrive through user.updated; the reconciliation catches missed ones */
@EventHandler(UserBannedEvent.eventName)
export class UnsubscribeNewsletterOnUserBannedEventHandler extends AbstractEventHandler<UserBannedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserBannedEvent): Promise<void> {
		const sync = container.resolve(NewsletterSyncService);
		if (!sync.isEnabled()) return;

		try {
			const outcome = await sync.unsubscribeUser(event.user.id);
			container.resolve(Logger).info('newsletter.sync.user-banned', {
				userId: event.user.id,
				outcome,
			});
		} catch (error) {
			container.resolve(Logger).error('newsletter.sync.user-banned.failed', {
				error: error as Error,
				userId: event.user.id,
			});
		}
	}
}

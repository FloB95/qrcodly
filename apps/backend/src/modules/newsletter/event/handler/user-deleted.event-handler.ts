import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { Logger } from '@/core/logging';
import { NewsletterSyncService } from '../../service/newsletter-sync.service';

@EventHandler(UserDeletedEvent.eventName)
export class RemoveNewsletterSubscriberOnUserDeletedEventHandler extends AbstractEventHandler<UserDeletedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserDeletedEvent): Promise<void> {
		const sync = container.resolve(NewsletterSyncService);
		if (!sync.isEnabled()) return;

		try {
			const outcome = await sync.removeUser(event.user.id);
			container.resolve(Logger).info('newsletter.sync.user-deleted', {
				userId: event.user.id,
				outcome,
			});
		} catch (error) {
			container.resolve(Logger).error('newsletter.sync.user-deleted.failed', {
				error: error as Error,
				userId: event.user.id,
			});
		}
	}
}

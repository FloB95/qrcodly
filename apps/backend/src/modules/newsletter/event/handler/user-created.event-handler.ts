import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserCreatedEvent } from '@/core/event/user-created.event';
import { Logger } from '@/core/logging';
import { NewsletterSyncService } from '../../service/newsletter-sync.service';

@EventHandler(UserCreatedEvent.eventName)
export class AddNewsletterSubscriberOnUserCreatedEventHandler extends AbstractEventHandler<UserCreatedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserCreatedEvent): Promise<void> {
		const sync = container.resolve(NewsletterSyncService);
		if (!sync.isEnabled()) return;

		try {
			const outcome = await sync.ensureSubscriber(await sync.getUser(event.user.id), 'signup');
			container.resolve(Logger).info('newsletter.sync.user-created', {
				userId: event.user.id,
				outcome,
			});
		} catch (error) {
			container.resolve(Logger).error('newsletter.sync.user-created.failed', {
				error: error as Error,
				userId: event.user.id,
			});
		}
	}
}

import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserUpdatedEvent } from '@/core/event/user-updated.event';
import { Logger } from '@/core/logging';
import { NewsletterSyncService } from '../../service/newsletter-sync.service';
import { fromUserJSON } from '../../domain/newsletter-user';

/** Outcomes of updates that change nothing, such as metadata writes */
const QUIET_OUTCOMES = new Set(['unchanged', 'missing', 'skipped']);

/**
 * Follows a changed primary email. A banned account (also banned in the Clerk dashboard) is taken
 * off the list; unbanning never puts it back.
 */
@EventHandler(UserUpdatedEvent.eventName)
export class SyncNewsletterEmailOnUserUpdatedEventHandler extends AbstractEventHandler<UserUpdatedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserUpdatedEvent): Promise<void> {
		const sync = container.resolve(NewsletterSyncService);
		if (!sync.isEnabled()) return;

		try {
			const user = fromUserJSON(event.user);
			const outcome = user.banned
				? await sync.unsubscribeUser(user.id)
				: await sync.syncEmail(user);
			if (!QUIET_OUTCOMES.has(outcome)) {
				container.resolve(Logger).info('newsletter.sync.user-updated', {
					userId: event.user.id,
					outcome,
				});
			}
		} catch (error) {
			container.resolve(Logger).error('newsletter.sync.user-updated.failed', {
				error: error as Error,
				userId: event.user.id,
			});
		}
	}
}

import { container } from 'tsyringe';
import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { UserCleanupFailedEvent } from '@/core/event/user-cleanup-failed.event';
import { AccountDeletionNotificationService } from '../../service/account-deletion-notification.service';

@EventHandler(UserCleanupFailedEvent.eventName)
export class AlertSupportOnUserCleanupFailedEventHandler extends AbstractEventHandler<UserCleanupFailedEvent> {
	constructor() {
		super();
	}

	async handle(event: UserCleanupFailedEvent): Promise<void> {
		await container.resolve(AccountDeletionNotificationService).notifyCleanupFailed(event.data);
	}
}

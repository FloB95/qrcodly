import { inject, injectable } from 'tsyringe';
import { EventEmitter } from '../event';
import { UserDeletedEvent } from '../event/user-deleted.event';
import { AbstractEvent } from '../event/abstract.event';
import { Logger } from '../logging';
import { UserCreatedEvent } from '../event/user-created.event';
import { UserUpdatedEvent } from '../event/user-updated.event';

export type ClerkEventType = 'user.created' | 'user.updated' | 'user.deleted';

export interface ClerkWebhookEvent<T = any> {
	type: ClerkEventType;
	data: T;
	timestamp: number;
}

// Mapping: Clerk Event -> Core Event Klasse (for user events)
const CLERK_USER_EVENT_MAP: Partial<Record<ClerkEventType, new (...args: any[]) => AbstractEvent>> =
	{
		'user.created': UserCreatedEvent,
		'user.updated': UserUpdatedEvent,
		'user.deleted': UserDeletedEvent,
	};

@injectable()
export class ClerkWebhookService {
	constructor(
		@inject(EventEmitter) private readonly eventEmitter: EventEmitter,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async handleWebhookEvent(event: ClerkWebhookEvent) {
		const UserEventClass = CLERK_USER_EVENT_MAP[event.type];
		if (UserEventClass) {
			const coreEvent = new UserEventClass(event.data);
			await this.eventEmitter.emit(coreEvent);
			return;
		}

		this.logger.warn(`[ClerkWebhook] Unhandled event type: ${event.type}`);
	}
}

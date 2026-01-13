import { inject, injectable } from 'tsyringe';
import { EventEmitter } from '../event';
import { UserDeletedEvent } from '../event/user-deleted.event';
import { AbstractEvent } from '../event/abstract.event';
import { Logger } from '../logging';
import { UserCreatedEvent } from '../event/user-created.event';
import { UserUpdatedEvent } from '../event/user-updated.event';

export type ClerkEventType =
	| 'user.created'
	| 'user.updated'
	| 'user.deleted'
	| 'subscription.active'
	| 'subscription.canceled'
	| 'subscription.past_due';

export interface ClerkWebhookEvent<T = any> {
	type: ClerkEventType;
	data: T;
	timestamp: number;
}

// Mapping: Clerk Event -> Core Event Klasse
const CLERK_EVENT_MAP: Record<ClerkEventType, (new (...args: any[]) => AbstractEvent) | null> = {
	'user.created': UserCreatedEvent,
	'user.updated': UserUpdatedEvent,
	'user.deleted': UserDeletedEvent,
	'subscription.active': null,
	'subscription.canceled': null,
	'subscription.past_due': null,
};

@injectable()
export class ClerkWebhookService {
	constructor(
		@inject(EventEmitter) private readonly eventEmitter: EventEmitter,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async handleWebhookEvent(event: ClerkWebhookEvent) {
		const EventClass = CLERK_EVENT_MAP[event.type];

		if (!EventClass) {
			this.logger.warn(`[ClerkWebhook] Unhandled event type: ${event.type}`);
			return;
		}

		const coreEvent = new EventClass(event.data);
		await this.eventEmitter.emit(coreEvent);
	}
}

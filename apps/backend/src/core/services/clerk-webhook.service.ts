import { inject, injectable } from 'tsyringe';
import { EventEmitter } from '../event';
import { UserDeletedEvent } from '../event/user-deleted.event';
import { AbstractEvent } from '../event/abstract.event';
import { Logger } from '../logging';
import { UserCreatedEvent } from '../event/user-created.event';
import { UserUpdatedEvent } from '../event/user-updated.event';
import { SubscriptionActiveEvent } from '../event/subscription-active.event';
import { SubscriptionCanceledEvent } from '../event/subscription-canceled.event';
import { SubscriptionPastDueEvent } from '../event/subscription-past-due.event';

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
		// Handle user events
		const UserEventClass = CLERK_USER_EVENT_MAP[event.type];
		if (UserEventClass) {
			const coreEvent = new UserEventClass(event.data);
			await this.eventEmitter.emit(coreEvent);
			return;
		}

		// Handle subscription events
		if (event.type.startsWith('subscription.')) {
			await this.handleSubscriptionEvent(event);
			return;
		}

		this.logger.warn(`[ClerkWebhook] Unhandled event type: ${event.type}`);
	}

	/**
	 * Handle subscription-related webhook events.
	 * Extracts user information and emits the appropriate domain event.
	 */
	private async handleSubscriptionEvent(event: ClerkWebhookEvent<any>) {
		const { data, type } = event;

		let coreEvent: AbstractEvent;

		switch (type) {
			case 'subscription.active':
				coreEvent = new SubscriptionActiveEvent(data);
				break;
			case 'subscription.canceled':
				coreEvent = new SubscriptionCanceledEvent(data);
				break;
			case 'subscription.past_due':
				coreEvent = new SubscriptionPastDueEvent(data);
				break;
			default:
				this.logger.warn(`[ClerkWebhook] Unknown subscription event type: ${type}`);
				return;
		}

		await this.eventEmitter.emit(coreEvent);
	}
}

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

/**
 * Clerk subscription webhook data structure.
 * This represents the data received from Clerk for subscription events.
 */
interface ClerkSubscriptionData {
	id: string;
	user_id: string;
	plan_id?: string;
	status: string;
	// User information may be included in the webhook
	user?: {
		id: string;
		email_addresses?: Array<{ email_address: string; id: string }>;
		first_name?: string;
		last_name?: string;
	};
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
	private async handleSubscriptionEvent(event: ClerkWebhookEvent<ClerkSubscriptionData>) {
		const { data, type } = event;

		// Extract user information from the webhook data
		const userId = data.user_id;
		const email = data.user?.email_addresses?.[0]?.email_address;
		const firstName = data.user?.first_name;

		if (!userId || !email) {
			this.logger.error(`[ClerkWebhook] Missing user information for subscription event`, {
				type,
				userId,
				hasEmail: !!email,
			});
			return;
		}

		const subscriptionData = {
			userId,
			email,
			firstName,
			subscriptionId: data.id,
		};

		let coreEvent: AbstractEvent;

		switch (type) {
			case 'subscription.active':
				coreEvent = new SubscriptionActiveEvent(subscriptionData);
				break;
			case 'subscription.canceled':
				coreEvent = new SubscriptionCanceledEvent(subscriptionData);
				break;
			case 'subscription.past_due':
				coreEvent = new SubscriptionPastDueEvent(subscriptionData);
				break;
			default:
				this.logger.warn(`[ClerkWebhook] Unknown subscription event type: ${type}`);
				return;
		}

		await this.eventEmitter.emit(coreEvent);
	}
}

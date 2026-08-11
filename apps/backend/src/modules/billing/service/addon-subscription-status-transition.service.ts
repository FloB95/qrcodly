import { inject, injectable } from 'tsyringe';
import { EventEmitter } from '@/core/event';
import { Logger } from '@/core/logging';
import { DomainAddonActiveEvent } from '@/core/event/domain-addon-active.event';
import { DomainAddonCanceledEvent } from '@/core/event/domain-addon-canceled.event';
import { DomainAddonCancelInitiatedEvent } from '@/core/event/domain-addon-cancel-initiated.event';
import { DomainAddonPastDueEvent } from '@/core/event/domain-addon-past-due.event';
import { DomainAddonReductionScheduledEvent } from '@/core/event/domain-addon-reduction-scheduled.event';
import { DomainAddonQuantityReducedEvent } from '@/core/event/domain-addon-quantity-reduced.event';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';

export interface AddonTransitionInput {
	userId: string;
	stripeSubscriptionId: string;
	stripePriceId: string;
	currentPeriodEnd: Date;
	quantity: number;
}

/**
 * Add-on counterpart of {@link SubscriptionStatusTransitionService}.
 *
 * Deliberately separate rather than a shared, product-parameterised service: the Pro events drive
 * plan entitlement and the Pro grace period, and a discriminator bug there would break billing for
 * every customer. Only the Clerk lookup is shared.
 */
@injectable()
export class AddonSubscriptionStatusTransitionService {
	constructor(
		@inject(EventEmitter) private readonly eventEmitter: EventEmitter,
		@inject(ClerkUserInfoService) private readonly clerkUserInfoService: ClerkUserInfoService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async handleTransition(
		input: AddonTransitionInput & { previousStatus: string; newStatus: string },
	): Promise<void> {
		if (input.previousStatus === input.newStatus) return;

		if (input.newStatus === 'active') {
			await this.emitActive(input);
		} else if (input.newStatus === 'canceled') {
			await this.emitCanceled(input);
		} else if (input.newStatus === 'past_due') {
			await this.emitPastDue(input);
		}
	}

	async emitActive(input: AddonTransitionInput): Promise<void> {
		await this.emit(DomainAddonActiveEvent, input);
	}

	async emitCanceled(input: AddonTransitionInput): Promise<void> {
		await this.emit(DomainAddonCanceledEvent, input);
	}

	async emitCancelInitiated(input: AddonTransitionInput): Promise<void> {
		await this.emit(DomainAddonCancelInitiatedEvent, input);
	}

	async emitPastDue(input: AddonTransitionInput): Promise<void> {
		await this.emit(DomainAddonPastDueEvent, input);
	}

	/**
	 * Not routed through {@link emit}: the announcement has to carry both the count still in force
	 * and the one taking over, which the shared event payload has no room for.
	 */
	async emitReductionScheduled(input: {
		userId: string;
		stripeSubscriptionId: string;
		quantity: number;
		scheduledQuantity: number;
		effectiveAt: Date;
	}): Promise<void> {
		const { email, firstName } = await this.clerkUserInfoService.getUserInfo(input.userId);

		this.logger.debug('domainAddon.transition', {
			subscription: {
				userId: input.userId,
				event: DomainAddonReductionScheduledEvent.eventName,
			},
		});

		await this.eventEmitter.emit(
			new DomainAddonReductionScheduledEvent({ ...input, email, firstName }),
		);
	}

	/** A parked reduction has taken effect and the surplus domains are already switched off. */
	async emitQuantityReduced(input: {
		userId: string;
		stripeSubscriptionId: string;
		quantity: number;
	}): Promise<void> {
		const { email, firstName } = await this.clerkUserInfoService.getUserInfo(input.userId);

		this.logger.debug('domainAddon.transition', {
			subscription: { userId: input.userId, event: DomainAddonQuantityReducedEvent.eventName },
		});

		await this.eventEmitter.emit(
			new DomainAddonQuantityReducedEvent({ ...input, email, firstName }),
		);
	}

	private async emit(
		EventClass:
			| typeof DomainAddonActiveEvent
			| typeof DomainAddonCanceledEvent
			| typeof DomainAddonCancelInitiatedEvent
			| typeof DomainAddonPastDueEvent,
		input: AddonTransitionInput,
	): Promise<void> {
		const { email, firstName } = await this.clerkUserInfoService.getUserInfo(input.userId);

		this.logger.debug('domainAddon.transition', {
			subscription: { userId: input.userId, event: EventClass.eventName },
		});

		await this.eventEmitter.emit(
			new EventClass({
				userId: input.userId,
				email,
				firstName,
				stripeSubscriptionId: input.stripeSubscriptionId,
				stripePriceId: input.stripePriceId,
				currentPeriodEnd: input.currentPeriodEnd,
				quantity: input.quantity,
			}),
		);
	}
}

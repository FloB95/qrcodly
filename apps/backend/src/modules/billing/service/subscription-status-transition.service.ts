import { inject, injectable } from 'tsyringe';
import { EventEmitter } from '@/core/event';
import { Logger } from '@/core/logging';
import { KeyCache } from '@/core/cache';
import { SubscriptionActiveEvent } from '@/core/event/subscription-active.event';
import { SubscriptionCanceledEvent } from '@/core/event/subscription-canceled.event';
import { SubscriptionPastDueEvent } from '@/core/event/subscription-past-due.event';
import { SubscriptionCancelInitiatedEvent } from '@/core/event/subscription-cancel-initiated.event';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';

export interface StatusTransitionInput {
	userId: string;
	previousStatus: string;
	newStatus: string;
	stripeSubscriptionId: string;
	stripePriceId: string;
	currentPeriodEnd: Date;
}

type UnconditionalInput = Omit<StatusTransitionInput, 'previousStatus' | 'newStatus'>;

@injectable()
export class SubscriptionStatusTransitionService {
	constructor(
		@inject(EventEmitter) private readonly eventEmitter: EventEmitter,
		@inject(Logger) private readonly logger: Logger,
		@inject(KeyCache) private readonly cache: KeyCache,
		@inject(ClerkUserInfoService) private readonly clerkUserInfoService: ClerkUserInfoService,
	) {}

	async handleTransition(input: StatusTransitionInput): Promise<void> {
		const { previousStatus, newStatus } = input;

		if (previousStatus === newStatus) return;

		if (newStatus === 'active') {
			await this.emitActive(input);
		} else if (newStatus === 'canceled') {
			await this.emitCanceled(input);
		} else if (newStatus === 'past_due') {
			await this.emitPastDue(input);
		}
	}

	async emitActive(input: UnconditionalInput): Promise<void> {
		await this.invalidateUserPlanCache(input.userId);
		const { email, firstName } = await this.getUserInfo(input.userId);

		await this.eventEmitter.emit(
			new SubscriptionActiveEvent({
				userId: input.userId,
				email,
				firstName,
				stripeSubscriptionId: input.stripeSubscriptionId,
				stripePriceId: input.stripePriceId,
				currentPeriodEnd: input.currentPeriodEnd,
			}),
		);
	}

	async emitCanceled(input: UnconditionalInput): Promise<void> {
		await this.invalidateUserPlanCache(input.userId);
		const { email, firstName } = await this.getUserInfo(input.userId);

		await this.eventEmitter.emit(
			new SubscriptionCanceledEvent({
				userId: input.userId,
				email,
				firstName,
				stripeSubscriptionId: input.stripeSubscriptionId,
				stripePriceId: input.stripePriceId,
				currentPeriodEnd: input.currentPeriodEnd,
			}),
		);
	}

	async emitCancelInitiated(input: UnconditionalInput): Promise<void> {
		await this.invalidateUserPlanCache(input.userId);
		const { email, firstName } = await this.getUserInfo(input.userId);

		await this.eventEmitter.emit(
			new SubscriptionCancelInitiatedEvent({
				userId: input.userId,
				email,
				firstName,
				stripeSubscriptionId: input.stripeSubscriptionId,
				stripePriceId: input.stripePriceId,
				currentPeriodEnd: input.currentPeriodEnd,
			}),
		);
	}

	async emitPastDue(input: UnconditionalInput): Promise<void> {
		await this.invalidateUserPlanCache(input.userId);
		const { email, firstName } = await this.getUserInfo(input.userId);

		await this.eventEmitter.emit(
			new SubscriptionPastDueEvent({
				userId: input.userId,
				email,
				firstName,
				stripeSubscriptionId: input.stripeSubscriptionId,
				stripePriceId: input.stripePriceId,
				currentPeriodEnd: input.currentPeriodEnd,
			}),
		);
	}

	private async getUserInfo(userId: string): Promise<{ email: string; firstName?: string }> {
		return this.clerkUserInfoService.getUserInfo(userId);
	}

	private async invalidateUserPlanCache(userId: string): Promise<void> {
		await this.cache.del(`user_plan:${userId}`);
	}
}

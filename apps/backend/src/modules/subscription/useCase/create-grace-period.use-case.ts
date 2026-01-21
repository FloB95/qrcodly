import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import SubscriptionGracePeriodRepository from '../domain/repository/subscription-grace-period.repository';

const GRACE_PERIOD_DAYS = 1;

interface CreateGracePeriodInput {
	userId: string;
	email: string;
	firstName?: string;
}

/**
 * Use case for creating a grace period entry when a subscription is canceled.
 * The user has 7 days to resubscribe before their custom domains are disabled.
 */
@injectable()
export class CreateGracePeriodUseCase implements IBaseUseCase {
	constructor(
		@inject(SubscriptionGracePeriodRepository)
		private gracePeriodRepository: SubscriptionGracePeriodRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Creates a grace period entry for a user.
	 * If one already exists, it will be replaced.
	 * @param input The user information and email.
	 * @returns The date when the grace period ends.
	 */
	async execute(input: CreateGracePeriodInput): Promise<Date> {
		const { userId, email, firstName } = input;

		// Check if there's already a grace period for this user
		const existing = await this.gracePeriodRepository.findByUserId(userId);
		if (existing) {
			// Delete existing grace period
			await this.gracePeriodRepository.delete(existing);
		}

		// Calculate grace period end date
		const gracePeriodEndsAt = new Date();
		gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS);

		// Generate new ID
		const id = await this.gracePeriodRepository.generateId();

		// Create new grace period
		await this.gracePeriodRepository.create({
			id,
			userId,
			email,
			firstName: firstName ?? null,
			gracePeriodEndsAt,
		});

		this.logger.info('subscription.gracePeriodCreated', {
			gracePeriod: {
				userId,
				gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
			},
		});

		return gracePeriodEndsAt;
	}
}

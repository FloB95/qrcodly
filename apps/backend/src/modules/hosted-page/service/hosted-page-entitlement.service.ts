import { inject, singleton } from 'tsyringe';
import {
	HOSTED_PAGE_PLAN_LIMITS,
	PlanName,
	type HostedPageLimits,
} from '@/core/config/plan.config';
import UserSubscriptionRepository from '@/modules/billing/domain/repository/user-subscription.repository';

/** Subscription statuses that grant Pro. Mirrors `resolveUserPlan`. */
const ENTITLING_STATUSES = new Set(['active', 'trialing']);

/**
 * Resolves the plan behind a hosted page from the database instead of the request user, which
 * is cached for minutes and absent entirely on public page loads.
 */
@singleton()
export class HostedPageEntitlementService {
	constructor(
		@inject(UserSubscriptionRepository)
		private readonly userSubscriptionRepository: UserSubscriptionRepository,
	) {}

	/** The plan that decides the limits for new pages and files. */
	async getPlan(userId: string): Promise<PlanName> {
		const subscription = await this.userSubscriptionRepository.findByUserId(userId);
		return subscription && ENTITLING_STATUSES.has(subscription.status)
			? PlanName.PRO
			: PlanName.FREE;
	}

	async getLimits(userId: string): Promise<{ plan: PlanName; limits: HostedPageLimits }> {
		const plan = await this.getPlan(userId);
		return { plan, limits: HOSTED_PAGE_PLAN_LIMITS[plan] };
	}

	/**
	 * Whether the owner's pages are served, decided like custom domains: they stay online through
	 * cancellation, failed payments and the grace period, go offline once the grace period job has
	 * disabled the Pro features, and come back when Pro is enabled again.
	 */
	async isServing(userId: string): Promise<boolean> {
		const subscription = await this.userSubscriptionRepository.findByUserId(userId);
		return !!subscription && subscription.proFeaturesDisabledAt === null;
	}
}

import { inject, singleton } from 'tsyringe';
import { CUSTOM_DOMAIN_PLAN_LIMITS, PlanName } from '../config/plan.config';
import UserSubscriptionRepository from '@/modules/billing/domain/repository/user-subscription.repository';
import UserAddonSubscriptionRepository from '@/modules/billing/domain/repository/user-addon-subscription.repository';

/** Subscription statuses that grant access. Mirrors `resolveUserPlan`. */
const ENTITLING_STATUSES = new Set(['active', 'trialing']);

export type TCustomDomainEntitlement = {
	/** Domains included in the plan itself. */
	baseLimit: number;
	/** Extra domain slots bought through the add-on. */
	addonSlots: number;
	effectiveLimit: number;
};

/**
 * Resolves how many custom domains a user may have.
 *
 * Reads the Pro status from the database rather than `request.user.plan`, which is cached for
 * up to five minutes — mixing a stale plan with a fresh slot count would hand out or withhold
 * domains the user did not pay for.
 */
@singleton()
export class CustomDomainEntitlementService {
	constructor(
		@inject(UserSubscriptionRepository)
		private readonly userSubscriptionRepository: UserSubscriptionRepository,
		@inject(UserAddonSubscriptionRepository)
		private readonly addonSubscriptionRepository: UserAddonSubscriptionRepository,
	) {}

	async getCustomDomainLimit(userId: string): Promise<TCustomDomainEntitlement> {
		const [subscription, addon] = await Promise.all([
			this.userSubscriptionRepository.findByUserId(userId),
			this.addonSubscriptionRepository.findByUserAndType(userId, 'custom_domain'),
		]);

		const proActive = !!subscription && ENTITLING_STATUSES.has(subscription.status);
		const baseLimit = proActive
			? CUSTOM_DOMAIN_PLAN_LIMITS[PlanName.PRO]
			: CUSTOM_DOMAIN_PLAN_LIMITS[PlanName.FREE];

		const addonActive =
			!!addon && ENTITLING_STATUSES.has(addon.status) && addon.addonFeaturesDisabledAt === null;

		// Pro is a hard prerequisite — without it, purchased slots grant nothing.
		const addonSlots = proActive && addonActive ? Math.max(0, addon.quantity) : 0;

		return { baseLimit, addonSlots, effectiveLimit: baseLimit + addonSlots };
	}
}

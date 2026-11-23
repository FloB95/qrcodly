import { ANALYTICS_INTEGRATION_PLAN_LIMITS, type PlanName } from '@/core/config/plan.config';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { UnauthorizedError } from '@/core/error/http';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { AbstractPolicy } from '@/core/policies/abstract.policy';

export class ManageAnalyticsIntegrationPolicy extends AbstractPolicy {
	private limits: Record<PlanName, number> = ANALYTICS_INTEGRATION_PLAN_LIMITS;

	constructor(
		private readonly user: TUser | undefined,
		private readonly currentIntegrationCount: number,
	) {
		super();
	}

	checkAccess(): true {
		if (!this.user) {
			throw new UnauthorizedError('You need to be logged in to manage analytics integrations.');
		}

		const limit = this.limits[this.user.plan ?? 'free'];
		if (limit === 0 || this.currentIntegrationCount >= limit) {
			throw new PlanLimitExceededError('analytics integration', limit);
		}

		return true;
	}
}

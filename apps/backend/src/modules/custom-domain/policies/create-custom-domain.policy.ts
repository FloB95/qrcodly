import { CUSTOM_DOMAIN_PLAN_LIMITS, type PlanName } from '@/core/config/plan.config';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { UnauthorizedError } from '@/core/error/http';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { AbstractPolicy } from '@/core/policies/abstract.policy';

export class CreateCustomDomainPolicy extends AbstractPolicy {
	private limits: Record<PlanName, number> = CUSTOM_DOMAIN_PLAN_LIMITS;

	constructor(
		private readonly user: TUser | undefined,
		private readonly currentDomainCount: number,
	) {
		super();
	}

	checkAccess(): true {
		if (!this.user) {
			throw new UnauthorizedError('You need to be logged in to add custom domains.');
		}

		const limit = this.limits[this.user.plan ?? 'free'];
		if (limit === 0 || this.currentDomainCount >= limit) {
			throw new PlanLimitExceededError('custom domain', limit);
		}

		return true;
	}
}

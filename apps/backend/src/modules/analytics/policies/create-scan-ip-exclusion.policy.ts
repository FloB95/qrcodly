import { SCAN_IP_EXCLUSION_PLAN_LIMITS, type PlanName } from '@/core/config/plan.config';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { AbstractPolicy } from '@/core/policies/abstract.policy';

export class CreateScanIpExclusionPolicy extends AbstractPolicy {
	private limits: Record<PlanName, number> = SCAN_IP_EXCLUSION_PLAN_LIMITS;

	constructor(
		private readonly user: TUser,
		private readonly currentCount: number,
	) {
		super();
	}

	checkAccess(): true {
		const limit = this.limits[this.user.plan ?? 'free'];
		if (limit === 0 || this.currentCount >= limit) {
			throw new PlanLimitExceededError('excluded IP range', limit);
		}

		return true;
	}
}

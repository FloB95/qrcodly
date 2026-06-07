import { PlanName } from '@/core/config/plan.config';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { UnauthorizedError } from '@/core/error/http';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { AbstractPolicy } from '@/core/policies/abstract.policy';

export class CreateCustomSlugPolicy extends AbstractPolicy {
	constructor(private readonly user: TUser | undefined) {
		super();
	}

	checkAccess(): true {
		if (!this.user) {
			throw new UnauthorizedError('You need to be logged in to set a custom slug.');
		}

		if (this.user.plan !== PlanName.PRO) {
			throw new PlanLimitExceededError('custom slug', 0);
		}

		return true;
	}
}

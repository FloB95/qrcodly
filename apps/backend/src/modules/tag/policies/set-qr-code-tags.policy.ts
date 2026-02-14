import { TAGS_PER_QR_CODE_PLAN_LIMITS, type PlanName } from '@/core/config/plan.config';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { UnauthorizedError } from '@/core/error/http';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { AbstractPolicy } from '@/core/policies/abstract.policy';

export class SetQrCodeTagsPolicy extends AbstractPolicy {
	private limits: Record<PlanName, number> = TAGS_PER_QR_CODE_PLAN_LIMITS;

	constructor(
		private readonly user: TUser | undefined,
		private readonly requestedTagCount: number,
	) {
		super();
	}

	checkAccess(): true {
		if (!this.user) {
			throw new UnauthorizedError('You need to be logged in to manage tags.');
		}

		const limit = this.limits[this.user.plan ?? 'free'];
		if (this.requestedTagCount > limit) {
			throw new PlanLimitExceededError('tags per QR code', limit);
		}

		return true;
	}
}

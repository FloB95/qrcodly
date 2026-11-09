import { type HostedPageLimits } from '@/core/config/plan.config';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { AbstractPolicy } from '@/core/policies/abstract.policy';
import { type THostedUsage } from '@shared/schemas';

/**
 * Landing pages and stored files, counted live across all hosted codes against the user's
 * effective limits. A save is only refused when it would exceed a limit and adds to that count, so
 * a user over the limit after a downgrade can still edit what they have, but not grow it.
 */
export class HostedPageLimitPolicy extends AbstractPolicy {
	constructor(
		private readonly limits: Pick<HostedPageLimits, 'maxLandingPages' | 'maxFiles'>,
		private readonly before: THostedUsage,
		private readonly after: THostedUsage,
	) {
		super();
	}

	checkAccess(): true {
		const grows = (after: number, before: number, limit: number) => after > limit && after > before;

		if (grows(this.after.landingPages, this.before.landingPages, this.limits.maxLandingPages)) {
			throw new PlanLimitExceededError('landing page', this.limits.maxLandingPages);
		}
		if (grows(this.after.files, this.before.files, this.limits.maxFiles)) {
			throw new PlanLimitExceededError('hosted file', this.limits.maxFiles);
		}
		return true;
	}
}

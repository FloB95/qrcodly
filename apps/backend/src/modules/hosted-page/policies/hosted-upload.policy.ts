import { HOSTED_PAGE_PLAN_LIMITS, type PlanName } from '@/core/config/plan.config';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { UnauthorizedError } from '@/core/error/http';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { AbstractPolicy } from '@/core/policies/abstract.policy';
import { type THostedUploadKind } from '@shared/schemas';
import { HostedFileTooLargeError } from '../error/http/hosted-file-too-large.error';

/** Upload size per plan. The multipart parser only applies the hard cap, so this runs after buffering. */
export class HostedUploadPolicy extends AbstractPolicy {
	constructor(
		private readonly user: TUser | undefined,
		private readonly kind: THostedUploadKind,
		private readonly fileSizeBytes: number,
	) {
		super();
	}

	checkAccess(): true {
		if (!this.user) {
			throw new UnauthorizedError('You need to be logged in to upload files for hosted pages');
		}

		const plan: PlanName = this.user.plan ?? 'free';
		const limits = HOSTED_PAGE_PLAN_LIMITS[plan];
		if (limits.maxFiles === 0) {
			throw new PlanLimitExceededError('hosted file', 0);
		}

		const maxBytes = limits.maxFileSizeBytes[this.kind];
		if (this.fileSizeBytes > maxBytes) {
			throw new HostedFileTooLargeError(this.fileSizeBytes, maxBytes, plan);
		}

		return true;
	}
}

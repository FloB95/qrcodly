import { BULK_IMPORT_PLAN_LIMITS, type PlanName } from '@/core/config/plan.config';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { ForbiddenError, UnauthorizedError } from '@/core/error/http';
import { AbstractPolicy } from '@/core/policies/abstract.policy';
import { BulkTooManyQrCodesError } from '../error/http/bulk-too-many-qr-codes.error';

export class BulkImportQrCodesPolicy extends AbstractPolicy {
	constructor(
		private readonly user: TUser | undefined,
		private readonly recordCount: number,
		private readonly fileSizeBytes: number,
	) {
		super();
	}

	checkAccess(): true {
		// bulk import requires authentication
		if (!this.user) {
			throw new UnauthorizedError('You need to be logged in to bulk import QR Codes');
		}

		const plan: PlanName = this.user.plan ?? 'free';
		const bulkLimits = BULK_IMPORT_PLAN_LIMITS[plan];

		// check file size limit
		if (this.fileSizeBytes > bulkLimits.maxFileSizeBytes) {
			const maxSizeMB = bulkLimits.maxFileSizeBytes / (1024 * 1024);
			const actualSizeMB = (this.fileSizeBytes / (1024 * 1024)).toFixed(2);
			throw new ForbiddenError(
				`File size ${actualSizeMB}MB exceeds the maximum allowed ${maxSizeMB}MB for your ${plan} plan.`,
			);
		}

		// check row count limit
		if (this.recordCount > bulkLimits.maxRows) {
			throw new BulkTooManyQrCodesError(this.recordCount, bulkLimits.maxRows, plan);
		}

		return true;
	}
}

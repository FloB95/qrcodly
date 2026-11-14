import { CustomApiError } from '@/core/error/http/custom-api.error';

/** Too many files were uploaded without being put on a page. */
export class HostedTooManyPendingUploadsError extends CustomApiError {
	public readonly errorCode = 'HOSTED_TOO_MANY_PENDING_UPLOADS' as const;

	constructor(limit: number) {
		super(
			`You have ${limit} uploaded files that are not used on a page yet. Save your page or wait a day before uploading more.`,
			429,
		);
	}
}

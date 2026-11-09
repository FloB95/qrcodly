import { TooManyRequestsError } from '@/core/error/http/too-many-requests.error';

/** Too many files were uploaded without being put on a page. */
export class HostedTooManyPendingUploadsError extends TooManyRequestsError {
	constructor(limit: number) {
		super(
			`You have ${limit} uploaded files that are not used on a page yet. Save your page or wait a day before uploading more.`,
		);
	}
}

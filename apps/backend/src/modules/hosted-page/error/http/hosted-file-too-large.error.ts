import { ForbiddenError } from '@/core/error/http';

export class HostedFileTooLargeError extends ForbiddenError {
	public readonly errorCode = 'HOSTED_FILE_TOO_LARGE' as const;

	constructor(fileSizeBytes: number, maxBytes: number, plan: string) {
		const actualMb = (fileSizeBytes / (1024 * 1024)).toFixed(2);
		const maxMb = maxBytes / (1024 * 1024);
		super(
			`File size ${actualMb}MB exceeds the maximum of ${maxMb}MB for your ${plan} plan. Please upgrade to upload larger files.`,
		);
	}
}

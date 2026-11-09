import { BadRequestError } from '@/core/error/http';

export class HostedFileTypeNotSupportedError extends BadRequestError {
	public readonly errorCode = 'HOSTED_FILE_TYPE_NOT_SUPPORTED' as const;

	/** `accepted` names the file types the upload kind takes, e.g. ["PNG", "JPEG", "WebP"]. */
	constructor(accepted: readonly string[]) {
		super(`Unsupported file type. Accepted: ${accepted.join(', ')}.`);
	}
}

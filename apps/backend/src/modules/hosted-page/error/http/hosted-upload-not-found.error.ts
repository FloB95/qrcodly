import { BadRequestError } from '@/core/error/http';

export class HostedUploadNotFoundError extends BadRequestError {
	public readonly errorCode = 'HOSTED_UPLOAD_NOT_FOUND' as const;

	constructor(fileKey: string) {
		super(
			`Unknown upload "${fileKey}". Upload the file first via POST /hosted-page/upload and pass the returned fileKey.`,
		);
	}
}

import { S3Error, TOriginalError } from './S3Error';

export class S3UploadError extends S3Error {
	constructor(message: string, originalError?: TOriginalError) {
		super(message, originalError);
		this.name = 'S3UploadError';
		Object.setPrototypeOf(this, S3UploadError.prototype);
	}
}

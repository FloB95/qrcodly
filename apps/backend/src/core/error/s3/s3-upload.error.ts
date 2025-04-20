import { S3Error, type TOriginalError } from './s3.error';

export class S3UploadError extends S3Error {
	constructor(message: string, originalError?: TOriginalError) {
		super(message, originalError);
		this.name = 'S3UploadError';
		Object.setPrototypeOf(this, S3UploadError.prototype);
	}
}

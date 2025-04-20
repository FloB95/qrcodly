import { S3Error, type TOriginalError } from './s3.error';

export class S3SignedUrlError extends S3Error {
	constructor(message: string, originalError?: TOriginalError) {
		super(message, originalError);
		this.name = 'S3SignedUrlError';
		Object.setPrototypeOf(this, S3SignedUrlError.prototype);
	}
}

import { S3Error, TOriginalError } from './S3Error';

export class S3SignedUrlError extends S3Error {
	constructor(message: string, originalError?: TOriginalError) {
		super(message, originalError);
		this.name = 'S3SignedUrlError';
		Object.setPrototypeOf(this, S3SignedUrlError.prototype);
	}
}

import { S3Error, type TOriginalError } from './s3.error';

export class S3DeleteError extends S3Error {
	constructor(message: string, originalError?: TOriginalError) {
		super(message, originalError);
		this.name = 'S3DeleteError';
		Object.setPrototypeOf(this, S3DeleteError.prototype);
	}
}

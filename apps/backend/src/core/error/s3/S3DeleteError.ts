import { S3Error, TOriginalError } from './S3Error';

export class S3DeleteError extends S3Error {
	constructor(message: string, originalError?: TOriginalError) {
		super(message, originalError);
		this.name = 'S3DeleteError';
		Object.setPrototypeOf(this, S3DeleteError.prototype);
	}
}

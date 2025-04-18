import { S3Error, TOriginalError } from './S3Error';

export class S3FetchError extends S3Error {
	constructor(message: string, originalError?: TOriginalError) {
		super(message, originalError);
		this.name = 'S3FetchError';
		Object.setPrototypeOf(this, S3FetchError.prototype);
	}
}

export type TOriginalError = { RequestId?: string } | object;

export class S3Error extends Error {
	constructor(
		message: string,
		public originalError?: TOriginalError,
	) {
		super(message);
		this.name = 'S3Error';
		if (originalError && 'RequestId' in originalError) {
			this.message += ` (Request ID: ${originalError?.RequestId})`;
		}
		Object.setPrototypeOf(this, S3Error.prototype);
	}
}

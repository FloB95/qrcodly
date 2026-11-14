import { BadRequestError } from '@/core/error/http';

/** The malware scanner found something in an uploaded file. */
export class FileRejectedError extends BadRequestError {
	public readonly errorCode = 'FILE_REJECTED' as const;

	constructor() {
		super('The file was rejected because the virus scanner found malware in it.');
	}
}

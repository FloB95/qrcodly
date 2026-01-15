import { BadRequestError } from '@/core/error/http';

export class RedirectLoopError extends BadRequestError {
	constructor() {
		super('The destination URL is not allowed to be a shortened URL.');
	}
}

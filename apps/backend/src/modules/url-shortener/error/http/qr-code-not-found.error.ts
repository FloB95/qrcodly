import { NotFoundError } from '@/core/error/http';

export class ShortUrlNotFoundError extends NotFoundError {
	constructor() {
		super('Short URL with the provided shortCode could not be found.');
	}
}

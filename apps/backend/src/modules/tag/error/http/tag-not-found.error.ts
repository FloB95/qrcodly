import { NotFoundError } from '@/core/error/http';

export class TagNotFoundError extends NotFoundError {
	constructor() {
		super('Tag not found.');
	}
}

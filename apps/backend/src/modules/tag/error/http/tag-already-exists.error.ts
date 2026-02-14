import { BadRequestError } from '@/core/error/http';

export class TagAlreadyExistsError extends BadRequestError {
	constructor() {
		super('A tag with this name already exists.');
	}
}

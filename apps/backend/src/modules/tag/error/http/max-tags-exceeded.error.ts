import { BadRequestError } from '@/core/error/http/bad-request.error';

export const MAX_TAGS_PER_RESOURCE = 3;

export class MaxTagsExceededError extends BadRequestError {
	constructor() {
		super(`You can add a maximum of ${MAX_TAGS_PER_RESOURCE} tags.`);
	}
}

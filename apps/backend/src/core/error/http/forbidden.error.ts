import { CustomApiError } from './custom-api.error';

export class ForbiddenError extends CustomApiError {
	constructor(message = "you don't have permission to access this route or resource") {
		super(message, 403);
	}
}

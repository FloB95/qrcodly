import { CustomApiError } from './CustomApiError';

export class UnauthorizedError extends CustomApiError {
	constructor(message = "you don't have permission to access this route or resource") {
		super(message, 403);
	}
}

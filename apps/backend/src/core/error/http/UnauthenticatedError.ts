import { CustomApiError } from './CustomApiError';

export class UnauthenticatedError extends CustomApiError {
	constructor(message = 'you need to be authenticated to access this route') {
		super(message, 401);
	}
}

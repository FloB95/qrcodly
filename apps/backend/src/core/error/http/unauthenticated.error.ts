import { CustomApiError } from './custom-api.error';

export class UnauthenticatedError extends CustomApiError {
	constructor(message = 'you need to be authenticated to access this route') {
		super(message, 401);
	}
}

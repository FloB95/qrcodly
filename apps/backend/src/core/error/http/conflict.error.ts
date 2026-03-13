import { CustomApiError } from './custom-api.error';

export class ConflictError extends CustomApiError {
	constructor(message = 'The resource is currently locked by another operation. Please retry.') {
		super(message, 409);
	}
}

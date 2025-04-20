import { CustomApiError } from './custom-api.error';

export class NotFoundError extends CustomApiError {
	constructor(message: string) {
		super(message, 404);
	}
}

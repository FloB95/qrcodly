import { CustomApiError } from './custom-api.error';

export class ServiceUnavailableError extends CustomApiError {
	constructor(message: string = 'Service temporarily unavailable') {
		super(message, 503);
	}
}

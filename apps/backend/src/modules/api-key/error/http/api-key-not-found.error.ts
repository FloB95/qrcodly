import { NotFoundError } from '@/core/error/http/not-found.error';

export class ApiKeyNotFoundError extends NotFoundError {
	constructor() {
		super('API key not found.');
	}
}

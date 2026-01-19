import { NotFoundError } from '@/core/error/http';

export class CustomDomainNotFoundError extends NotFoundError {
	constructor() {
		super('Custom domain with the provided ID could not be found.');
	}
}

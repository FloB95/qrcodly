import { BadRequestError } from '@/core/error/http';

export class DomainAlreadyExistsError extends BadRequestError {
	constructor(domain: string) {
		super(`The domain "${domain}" is already registered.`);
	}
}

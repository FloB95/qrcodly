import { NotFoundError } from '@/core/error/http';

export class ConfigTemplateNotFoundError extends NotFoundError {
	constructor() {
		super('Config Template not found.');
	}
}

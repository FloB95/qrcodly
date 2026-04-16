import { ForbiddenError } from '@/core/error/http/forbidden.error';

export class ProPlanRequiredError extends ForbiddenError {
	constructor() {
		super('A Pro plan is required to create API keys.');
	}
}

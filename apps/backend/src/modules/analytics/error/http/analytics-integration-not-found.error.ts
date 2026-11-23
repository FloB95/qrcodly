import { NotFoundError } from '@/core/error/http';

export class AnalyticsIntegrationNotFoundError extends NotFoundError {
	constructor() {
		super('Analytics integration with the provided ID could not be found.');
	}
}

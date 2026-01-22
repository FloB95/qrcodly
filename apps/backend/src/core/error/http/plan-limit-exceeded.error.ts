import { ForbiddenError } from './forbidden.error';

export class PlanLimitExceededError extends ForbiddenError {
	constructor(key: string, limit: number) {
		let message = `Plan limit exceeded: You have reached the maximum of ${limit} ${key}(s) for your current plan. Please upgrade to continue.`;
		if (limit === 0) {
			message = `Plan limit exceeded: With your current plan you cannot use this feature. Please upgrade to continue.`;
		}
		super(message);
	}
}

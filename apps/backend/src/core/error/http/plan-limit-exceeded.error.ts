import { ForbiddenError } from './forbidden.error';

export class PlanLimitExceededError extends ForbiddenError {
	constructor(key: string, limit: number) {
		super(
			`Plan limit exceeded: You have reached the maximum of ${limit} ${key}(s) for your current plan. Please upgrade to continue.`,
		);
	}
}

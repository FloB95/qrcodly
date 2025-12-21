// rate-limit.resolver.ts
import { type FastifyRequest } from 'fastify';
import { RATE_LIMIT_POLICIES, type RateLimitPolicy } from './rate-limit.policy';
import { PlanName } from '../config/plan.config';

export function resolveRateLimit(request: FastifyRequest, policy: RateLimitPolicy) {
	const limits = RATE_LIMIT_POLICIES[policy];

	if (request.user?.plan === PlanName.PRO) {
		return limits.pro_plan;
	}

	return request.user ? limits.authenticated : limits.anonymous;
}

// rate-limit.resolver.ts
import { type FastifyRequest } from 'fastify';
import { RATE_LIMIT_POLICIES, type RateLimitPolicy } from './rate-limit.policy';

export function resolveRateLimit(request: FastifyRequest, policy: RateLimitPolicy) {
	const limits = RATE_LIMIT_POLICIES[policy];
	return request.user ? limits.authenticated : limits.anonymous;
}

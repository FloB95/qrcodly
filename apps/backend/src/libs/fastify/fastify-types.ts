import { type TUser } from '@/core/domain/schema/UserSchema';
import { type RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import 'fastify';

declare module 'fastify' {
	interface FastifyRequest {
		clientIp?: string;
		user?: TUser;
		startTime?: bigint;
	}

	interface FastifyContextConfig {
		rateLimitPolicy?: RateLimitPolicy;
	}
}

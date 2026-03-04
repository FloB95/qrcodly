import { type TUser } from '@/core/domain/schema/UserSchema';
import { type RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import 'fastify';

declare module 'fastify' {
	interface FastifyRequest {
		clientIp?: string;
		user?: TUser;
	}

	interface FastifyContextConfig {
		rateLimitPolicy?: RateLimitPolicy;
	}
}

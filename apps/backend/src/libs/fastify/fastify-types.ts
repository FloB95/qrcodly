import { type TUser } from '@/core/domain/schema/UserSchema';
import 'fastify';

declare module 'fastify' {
	interface FastifyRequest {
		clientIp?: string;
		user?: TUser;
	}
}

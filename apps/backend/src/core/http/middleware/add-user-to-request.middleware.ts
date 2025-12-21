import { PlanName } from '@/core/config/plan.config';
import { type TTokenType } from '@/core/domain/schema/UserSchema';
import { Logger } from '@/core/logging';
import { getAuth } from '@clerk/fastify';
import { type FastifyRequest } from 'fastify';
import { container } from 'tsyringe';

export function addUserToRequestMiddleware(
	request: FastifyRequest,
	_reply: unknown,
	done: () => void,
) {
	const { userId, tokenType, has } = getAuth(request, {
		acceptsToken: ['session_token', 'api_key'],
	}) as { userId: string | null; tokenType: TTokenType; has: any };

	// don´t log health check & uptime kuma
	if (request.clientIp !== '127.0.0.1' && request.clientIp !== '152.53.13.36') {
		container.resolve(Logger).info('api.request', {
			requestId: request.id,
			ip: request.clientIp,
			method: request.method,
			path: request.url,
			accessType: tokenType,
			userId: userId,
		});
	}

	request.user = userId
		? // eslint-disable-next-line @typescript-eslint/no-unsafe-call
			{ id: userId, tokenType, plan: has({ plan: PlanName.PRO }) ? PlanName.PRO : PlanName.FREE }
		: undefined;
	done();
}

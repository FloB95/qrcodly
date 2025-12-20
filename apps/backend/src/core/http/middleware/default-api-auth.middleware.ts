import { type TTokenType } from '@/core/domain/schema/UserSchema';
import { UnauthenticatedError } from '@/core/error/http';
import { Logger } from '@/core/logging';
import { getAuth } from '@clerk/fastify';
import { type FastifyRequest } from 'fastify';
import { container } from 'tsyringe';

/**
 * Middleware function to check if a user is signed in.
 *
 * @returns A middleware function that checks if the user is authenticated.
 *
 * @throws {UnauthenticatedError} If the user is not authenticated.
 */
export function defaultApiAuthMiddleware(
	request: FastifyRequest,
	_reply: unknown,
	done: () => void,
) {
	const { userId, tokenType } = getAuth(request, {
		acceptsToken: ['session_token', 'api_key'],
	}) as { userId: string | null; tokenType: TTokenType };

	if (!userId) {
		throw new UnauthenticatedError();
	}

	container.resolve(Logger).info('api.request', {
		requestId: request.id,
		ip: request.clientIp,
		method: request.method,
		path: request.url,
		accessType: tokenType,
		userId: userId,
	});

	request.user = { id: userId, tokenType };
	done();
}

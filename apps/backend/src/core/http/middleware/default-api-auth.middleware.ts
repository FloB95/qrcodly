import { UnauthorizedError } from '@/core/error/http';
import { type FastifyRequest } from 'fastify';

/**
 * Middleware function to check if a user is signed in.
 *
 * @returns A middleware function that checks if the user is authenticated.
 *
 * @throws {UnauthorizedError} If the user is not authenticated.
 */
export function defaultApiAuthMiddleware(
	request: FastifyRequest,
	_reply: unknown,
	done: () => void,
) {
	if (!request.user?.id) {
		throw new UnauthorizedError();
	}

	done();
}

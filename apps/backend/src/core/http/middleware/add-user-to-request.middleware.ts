import { PlanName } from '@/core/config/plan.config';
import { UnauthorizedError } from '@/core/error/http';
import { Logger } from '@/core/logging';
import { getAuth } from '@clerk/fastify';
import { type FastifyRequest } from 'fastify';
import { container } from 'tsyringe';

/**
 * Middleware function to check if a user is signed in.
 *
 * @returns A middleware function that checks if the user is authenticated.
 *
 * @throws {UnauthorizedError} If the user is not authenticated.
 */
export function addUserToRequestMiddleware(
	request: FastifyRequest,
	_reply: unknown,
	done: () => void,
) {
	const { userId, tokenType, has } = getAuth(request, {
		acceptsToken: ['session_token', 'api_key'],
	}) as { userId: string | null; tokenType: string; has: any };

	/* eslint-disable @typescript-eslint/no-unsafe-call */
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	request.user = userId
		? { id: userId, tokenType, plan: has({ plan: PlanName.PRO }) ? PlanName.PRO : PlanName.FREE }
		: null;
	done();
}

import { UnauthenticatedError } from '@/core/error/http';
import { getAuth } from '@clerk/fastify';
import { FastifyRequest } from 'fastify';

/**
 * Middleware function to check if a user is signed in.
 *
 * @returns A middleware function that checks if the user is authenticated.
 *
 * @throws {UnauthenticatedError} If the user is not authenticated.
 */
export function isAuthenticated(request: FastifyRequest, _reply: unknown, done: () => void) {
    const { userId } = getAuth(request);

    if (!userId) {
        throw new UnauthenticatedError();
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    request.user = { id: userId };
    done();
}

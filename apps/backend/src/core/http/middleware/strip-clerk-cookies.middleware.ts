import { type FastifyReply, type FastifyRequest, type HookHandlerDoneFunction } from 'fastify';

// Every cookie @clerk/backend reads, suffixed variants (`__session_<suffix>`) included
const CLERK_COOKIE_PREFIXES = ['__session', '__client_uat', '__refresh', '__clerk_'];

/**
 * The API authenticates by the Authorization header only. Clerk would otherwise also accept its
 * session cookie, a credential the browser attaches without the calling page asking for it.
 */
export function stripClerkCookiesMiddleware(
	request: FastifyRequest,
	_reply: FastifyReply,
	done: HookHandlerDoneFunction,
) {
	const { cookie } = request.headers;
	if (cookie) {
		const kept = cookie
			.split(';')
			.filter(
				(pair) => !CLERK_COOKIE_PREFIXES.some((prefix) => pair.trimStart().startsWith(prefix)),
			);

		if (kept.length > 0) {
			request.headers.cookie = kept.join(';');
		} else {
			delete request.headers.cookie;
		}
	}
	done();
}

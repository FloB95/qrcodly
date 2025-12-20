import { type TTokenType } from '@/core/domain/schema/UserSchema';
import { getAuth } from '@clerk/fastify';
import { type FastifyRequest } from 'fastify';

export function addUserToRequestMiddleware(
	request: FastifyRequest,
	_reply: unknown,
	done: () => void,
) {
	const { userId, tokenType } = getAuth(request, {
		acceptsToken: ['session_token', 'api_key'],
	}) as { userId: string | null; tokenType: TTokenType };

	request.user = userId ? { id: userId, tokenType } : undefined;
	done();
}

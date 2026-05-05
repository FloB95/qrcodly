import { type FastifyRequest } from 'fastify';
import { type TTokenType } from '@/core/domain/schema/UserSchema';
import { TokenTypeNotAllowedError } from '@/core/error/http/token-type-not-allowed.error';

/**
 * preHandler that rejects requests whose auth token type isn't in `allowed`.
 * Used to lock security-critical routes (e.g. API-key management) to session-only.
 */
export const enforceTokenType =
	(allowed: TTokenType[]) =>
	async (request: FastifyRequest): Promise<void> => {
		const user = request.user;
		if (!user) return;
		if (allowed.includes(user.tokenType)) return;
		throw new TokenTypeNotAllowedError(user.tokenType, allowed);
	};

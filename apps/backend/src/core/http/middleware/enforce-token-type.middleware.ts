import { type FastifyRequest } from 'fastify';
import { type TTokenType } from '@/core/domain/schema/UserSchema';
import { TokenTypeNotAllowedError } from '@/core/error/http/token-type-not-allowed.error';

/**
 * Returns a Fastify preHandler that restricts which authentication token types
 * may call a route. Used to lock security-critical endpoints (API-key
 * management) to web-UI users only — an API-key holder cannot mint, list,
 * update, or revoke other keys.
 *
 * Behaviour:
 * - No `request.user` (route opted out of auth) → no-op.
 * - Token type is in the allowed list → no-op.
 * - Token type is NOT in the allowed list → throws TokenTypeNotAllowedError (403).
 */
export const enforceTokenType =
	(allowed: TTokenType[]) =>
	async (request: FastifyRequest): Promise<void> => {
		const user = request.user;
		if (!user) return;
		if (allowed.includes(user.tokenType)) return;
		throw new TokenTypeNotAllowedError(user.tokenType, allowed);
	};

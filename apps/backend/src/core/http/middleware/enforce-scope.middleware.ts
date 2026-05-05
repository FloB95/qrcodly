import { type FastifyRequest } from 'fastify';
import { type ApiKeyScope } from '@shared/schemas';
import { InsufficientScopeError } from '@/core/error/http/insufficient-scope.error';

/**
 * Returns a Fastify preHandler that enforces an API-key scope.
 *
 * Behaviour:
 * - No `request.user` (route opted out of auth) → no-op.
 * - Token type is not `api_key` (session, m2m, oauth) → no-op. Scopes only apply to API keys.
 * - API key has empty scopes (legacy keys created before this feature) → no-op (grandfathered).
 * - API key has scopes but doesn't include the required one → throws `InsufficientScopeError` (403).
 */
export const enforceScope =
	(required: ApiKeyScope) =>
	async (request: FastifyRequest): Promise<void> => {
		const user = request.user;
		if (!user) return;
		if (user.tokenType !== 'api_key') return;

		const scopes = user.scopes ?? [];
		if (scopes.length === 0) return;

		if (!scopes.includes(required)) {
			throw new InsufficientScopeError(required, scopes);
		}
	};

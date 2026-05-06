import { type FastifyRequest } from 'fastify';
import { type ApiKeyScope } from '@shared/schemas';
import { InsufficientScopeError } from '@/core/error/http/insufficient-scope.error';

/**
 * preHandler that rejects api_key requests missing the required scope.
 * No-ops for non-api_key tokens and for legacy keys with empty scopes.
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

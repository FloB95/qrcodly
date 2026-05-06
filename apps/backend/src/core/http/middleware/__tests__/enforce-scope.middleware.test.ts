import { type FastifyRequest } from 'fastify';
import { type ApiKeyScope } from '@shared/schemas';
import { enforceScope } from '../enforce-scope.middleware';
import { InsufficientScopeError } from '@/core/error/http/insufficient-scope.error';

const fakeRequest = (
	user: { tokenType: string; scopes?: string[]; id?: string; plan?: string } | undefined,
) => ({ user }) as unknown as FastifyRequest;

describe('enforceScope', () => {
	const cases: Array<{
		name: string;
		required: ApiKeyScope;
		user: { tokenType: string; scopes?: string[] } | undefined;
		expectThrow: boolean;
	}> = [
		{
			name: 'no user (route opted out of auth)',
			required: 'read',
			user: undefined,
			expectThrow: false,
		},
		{
			name: 'session token bypass',
			required: 'delete',
			user: { tokenType: 'session_token' },
			expectThrow: false,
		},
		{
			name: 'm2m token bypass',
			required: 'delete',
			user: { tokenType: 'm2m_token' },
			expectThrow: false,
		},
		{
			name: 'oauth token bypass',
			required: 'delete',
			user: { tokenType: 'oauth_token' },
			expectThrow: false,
		},
		{
			name: 'api_key with empty scopes (legacy grandfather)',
			required: 'delete',
			user: { tokenType: 'api_key', scopes: [] },
			expectThrow: false,
		},
		{
			name: 'api_key with no scopes property (legacy grandfather)',
			required: 'delete',
			user: { tokenType: 'api_key' },
			expectThrow: false,
		},
		{
			name: 'api_key with matching scope (read)',
			required: 'read',
			user: { tokenType: 'api_key', scopes: ['read'] },
			expectThrow: false,
		},
		{
			name: 'api_key with matching scope (write)',
			required: 'write',
			user: { tokenType: 'api_key', scopes: ['read', 'write'] },
			expectThrow: false,
		},
		{
			name: 'api_key with matching scope (update)',
			required: 'update',
			user: { tokenType: 'api_key', scopes: ['update'] },
			expectThrow: false,
		},
		{
			name: 'api_key with matching scope (delete)',
			required: 'delete',
			user: { tokenType: 'api_key', scopes: ['delete'] },
			expectThrow: false,
		},
		{
			name: 'api_key with all four scopes',
			required: 'delete',
			user: { tokenType: 'api_key', scopes: ['read', 'write', 'update', 'delete'] },
			expectThrow: false,
		},
		{
			name: 'api_key with non-matching scope (read-only key, write required)',
			required: 'write',
			user: { tokenType: 'api_key', scopes: ['read'] },
			expectThrow: true,
		},
		{
			name: 'api_key with read+write but delete required',
			required: 'delete',
			user: { tokenType: 'api_key', scopes: ['read', 'write'] },
			expectThrow: true,
		},
		{
			name: 'api_key with unknown scope value (forward-compat)',
			required: 'read',
			user: { tokenType: 'api_key', scopes: ['something_we_dont_know'] },
			expectThrow: true,
		},
	];

	cases.forEach(({ name, required, user, expectThrow }) => {
		it(name, async () => {
			const handler = enforceScope(required);
			const req = fakeRequest(user);
			if (expectThrow) {
				await expect(handler(req)).rejects.toBeInstanceOf(InsufficientScopeError);
			} else {
				await expect(handler(req)).resolves.toBeUndefined();
			}
		});
	});

	it('attaches requiredScope and grantedScopes on the thrown error', async () => {
		const handler = enforceScope('delete');
		const req = fakeRequest({ tokenType: 'api_key', scopes: ['read'] });
		await expect(handler(req)).rejects.toMatchObject({
			errorCode: 'INSUFFICIENT_SCOPE',
			requiredScope: 'delete',
			grantedScopes: ['read'],
			statusCode: 403,
		});
	});
});

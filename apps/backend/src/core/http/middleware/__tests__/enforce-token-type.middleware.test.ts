import { type FastifyRequest } from 'fastify';
import { enforceTokenType } from '../enforce-token-type.middleware';
import { TokenTypeNotAllowedError } from '@/core/error/http/token-type-not-allowed.error';

const fakeRequest = (user: { tokenType: string } | undefined) =>
	({ user }) as unknown as FastifyRequest;

describe('enforceTokenType', () => {
	it('no-op when there is no user (auth-skipped route)', async () => {
		const handler = enforceTokenType(['session_token']);
		await expect(handler(fakeRequest(undefined))).resolves.toBeUndefined();
	});

	it('passes when token type is in the allowed list', async () => {
		const handler = enforceTokenType(['session_token', 'api_key']);
		await expect(handler(fakeRequest({ tokenType: 'session_token' }))).resolves.toBeUndefined();
		await expect(handler(fakeRequest({ tokenType: 'api_key' }))).resolves.toBeUndefined();
	});

	it('throws when token type is not in the allowed list', async () => {
		const handler = enforceTokenType(['session_token']);
		await expect(handler(fakeRequest({ tokenType: 'api_key' }))).rejects.toBeInstanceOf(
			TokenTypeNotAllowedError,
		);
	});

	it('attaches providedTokenType and allowedTokenTypes on the thrown error', async () => {
		const handler = enforceTokenType(['session_token']);
		await expect(handler(fakeRequest({ tokenType: 'api_key' }))).rejects.toMatchObject({
			errorCode: 'TOKEN_TYPE_NOT_ALLOWED',
			providedTokenType: 'api_key',
			allowedTokenTypes: ['session_token'],
			statusCode: 403,
		});
	});
});

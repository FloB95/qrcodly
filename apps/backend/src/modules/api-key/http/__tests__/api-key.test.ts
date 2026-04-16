import { container } from 'tsyringe';
import { type FastifyInstance } from 'fastify';
import { resetTestState } from '@/tests/shared/test-context';
import { ClerkApiKeysService } from '../../service/clerk-api-keys.service';
import {
	API_KEY_API_PATH,
	QR_CODE_API_PATH,
	createApiKeyRequest,
	getTestContext,
	listApiKeysRequest,
	revokeApiKeyRequest,
} from './utils';

describe('api-key endpoints', () => {
	let testServer: FastifyInstance;
	let accessTokenFree: string;
	let accessToken2Free: string;
	let accessTokenPro: string;
	const createdApiKeyIds: string[] = [];

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessTokenFree = ctx.accessToken;
		accessToken2Free = ctx.accessToken2;
		accessTokenPro = ctx.accessTokenPro;
	});

	afterAll(async () => {
		// Clean up any keys left in Clerk so repeated test runs stay hermetic.
		const clerk = container.resolve(ClerkApiKeysService);
		await Promise.allSettled(createdApiKeyIds.map((id) => clerk.apiKeys.revoke({ apiKeyId: id })));
	});

	describe('POST /api-key', () => {
		it('returns 401 without a bearer token', async () => {
			const response = await testServer.inject({
				method: 'POST',
				url: API_KEY_API_PATH,
				payload: { name: 'No auth' },
			});
			expect(response.statusCode).toBe(401);
		});

		it('returns 403 for a free-plan user', async () => {
			const response = await createApiKeyRequest(
				testServer,
				{ name: 'Free user key' },
				accessTokenFree,
			);
			expect(response.statusCode).toBe(403);
		});

		it('creates a key for a pro-plan user and returns the secret exactly once', async () => {
			const response = await createApiKeyRequest(
				testServer,
				{ name: 'Pro integration test' },
				accessTokenPro,
			);
			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.payload);
			expect(body).toEqual(
				expect.objectContaining({
					id: expect.any(String),
					name: 'Pro integration test',
					secret: expect.any(String),
					createdAt: expect.any(Number),
					revoked: false,
				}),
			);
			expect(body.secret.length).toBeGreaterThan(10);
			createdApiKeyIds.push(body.id);

			// Subsequent list response must NOT contain the secret.
			const listResponse = await listApiKeysRequest(testServer, accessTokenPro);
			expect(listResponse.statusCode).toBe(200);
			const { data } = JSON.parse(listResponse.payload) as {
				data: Array<{ id: string; secret?: string }>;
			};
			const listed = data.find((k) => k.id === body.id);
			expect(listed).toBeDefined();
			expect(listed).not.toHaveProperty('secret');
		});

		it('rejects an invalid body with 400', async () => {
			const response = await testServer.inject({
				method: 'POST',
				url: API_KEY_API_PATH,
				headers: { Authorization: `Bearer ${accessTokenPro}` },
				payload: { name: '' },
			});
			expect(response.statusCode).toBe(400);
		});
	});

	describe('GET /api-key', () => {
		it('only returns keys belonging to the authenticated user', async () => {
			const createForPro = await createApiKeyRequest(
				testServer,
				{ name: 'Pro scoped key' },
				accessTokenPro,
			);
			expect(createForPro.statusCode).toBe(201);
			const proKeyId = JSON.parse(createForPro.payload).id as string;
			createdApiKeyIds.push(proKeyId);

			const listForOtherUser = await listApiKeysRequest(testServer, accessToken2Free);
			expect(listForOtherUser.statusCode).toBe(200);
			const { data } = JSON.parse(listForOtherUser.payload) as {
				data: Array<{ id: string }>;
			};
			expect(data.find((k) => k.id === proKeyId)).toBeUndefined();
		});
	});

	describe('DELETE /api-key/:id', () => {
		it('revokes a key owned by the caller', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'To be revoked' },
				accessTokenPro,
			);
			expect(createResponse.statusCode).toBe(201);
			const keyId = JSON.parse(createResponse.payload).id as string;
			createdApiKeyIds.push(keyId);

			const revokeResponse = await revokeApiKeyRequest(testServer, keyId, accessTokenPro);
			expect(revokeResponse.statusCode).toBe(200);
			expect(JSON.parse(revokeResponse.payload)).toEqual({ deleted: true });

			const listResponse = await listApiKeysRequest(testServer, accessTokenPro);
			const { data } = JSON.parse(listResponse.payload) as { data: Array<{ id: string }> };
			expect(data.find((k) => k.id === keyId)).toBeUndefined();
		});

		it('returns 404 when trying to revoke a key owned by another user', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Owned by pro' },
				accessTokenPro,
			);
			const keyId = JSON.parse(createResponse.payload).id as string;
			createdApiKeyIds.push(keyId);

			const revokeResponse = await revokeApiKeyRequest(testServer, keyId, accessToken2Free);
			expect(revokeResponse.statusCode).toBe(404);
		});

		it('returns 404 for an unknown key id', async () => {
			const response = await revokeApiKeyRequest(
				testServer,
				'api_key_does_not_exist_999',
				accessTokenPro,
			);
			expect(response.statusCode).toBe(404);
		});
	});

	describe('Bearer-auth via api_key secret', () => {
		it('accepts a freshly-created API key secret on GET /qr-code', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Smoke-test key' },
				accessTokenPro,
			);
			const { id, secret } = JSON.parse(createResponse.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(id);

			const qrResponse = await testServer.inject({
				method: 'GET',
				url: `${QR_CODE_API_PATH}?page=1&limit=1`,
				headers: { Authorization: `Bearer ${secret}` },
			});
			expect(qrResponse.statusCode).toBe(200);
		});

		it('rejects a revoked key on protected routes', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Short-lived smoke' },
				accessTokenPro,
			);
			const { id, secret } = JSON.parse(createResponse.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(id);

			const revokeResponse = await revokeApiKeyRequest(testServer, id, accessTokenPro);
			expect(revokeResponse.statusCode).toBe(200);

			const qrResponse = await testServer.inject({
				method: 'GET',
				url: `${QR_CODE_API_PATH}?page=1&limit=1`,
				headers: { Authorization: `Bearer ${secret}` },
			});
			expect(qrResponse.statusCode).toBe(401);
		});
	});

	describe('Security & data-leak scenarios', () => {
		it('never returns a secret in list responses, even for the owner', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'No-leak verification' },
				accessTokenPro,
			);
			const keyId = JSON.parse(createResponse.payload).id as string;
			createdApiKeyIds.push(keyId);

			const listResponse = await listApiKeysRequest(testServer, accessTokenPro);
			const payloadStr = listResponse.payload;
			expect(payloadStr).not.toContain('"secret"');
			expect(payloadStr).not.toContain('sk_');
		});

		it("does not leak existence of other users' keys via 404 vs 403 differentiation", async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Isolation probe' },
				accessTokenPro,
			);
			const realKeyId = JSON.parse(createResponse.payload).id as string;
			createdApiKeyIds.push(realKeyId);

			const foreignAttempt = await revokeApiKeyRequest(testServer, realKeyId, accessToken2Free);
			const fakeAttempt = await revokeApiKeyRequest(
				testServer,
				'api_key_nonexistent_xyz',
				accessToken2Free,
			);
			expect(foreignAttempt.statusCode).toBe(fakeAttempt.statusCode);
		});

		it('persists description and expiration and returns them on list', async () => {
			const expiresInDays = 30;
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'With metadata', description: 'Used by the InDesign plugin', expiresInDays },
				accessTokenPro,
			);
			expect(createResponse.statusCode).toBe(201);
			const created = JSON.parse(createResponse.payload);
			createdApiKeyIds.push(created.id);

			expect(created.description).toBe('Used by the InDesign plugin');
			expect(created.expiration).toEqual(expect.any(Number));
			expect(created.expiration).toBeGreaterThan(Date.now() + 29 * 86400 * 1000);

			const listResponse = await listApiKeysRequest(testServer, accessTokenPro);
			const listed = (
				JSON.parse(listResponse.payload).data as Array<{
					id: string;
					description: string | null;
					expiration: number | null;
				}>
			).find((k) => k.id === created.id);
			expect(listed).toBeDefined();
			expect(listed?.description).toBe('Used by the InDesign plugin');
			expect(listed?.expiration).toBe(created.expiration);
		});

		it('rejects a name longer than 64 chars', async () => {
			const response = await createApiKeyRequest(
				testServer,
				{ name: 'x'.repeat(65) },
				accessTokenPro,
			);
			expect(response.statusCode).toBe(400);
		});

		it('rejects a description longer than 256 chars', async () => {
			const response = await createApiKeyRequest(
				testServer,
				{ name: 'Bad desc', description: 'x'.repeat(257) },
				accessTokenPro,
			);
			expect(response.statusCode).toBe(400);
		});

		it('rejects negative expiresInDays', async () => {
			const response = await createApiKeyRequest(
				testServer,
				{ name: 'Negative TTL', expiresInDays: -1 },
				accessTokenPro,
			);
			expect(response.statusCode).toBe(400);
		});

		it('accepts the maximum allowed name and description lengths end-to-end with Clerk', async () => {
			const response = await createApiKeyRequest(
				testServer,
				{
					name: 'x'.repeat(64),
					description: 'y'.repeat(256),
					expiresInDays: 365,
				},
				accessTokenPro,
			);
			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.payload);
			expect(body.name.length).toBe(64);
			expect(body.description.length).toBe(256);
			createdApiKeyIds.push(body.id);
		});

		it('free user remains Pro-gated even when using a valid session token for other routes', async () => {
			const meCheck = await testServer.inject({
				method: 'GET',
				url: `${QR_CODE_API_PATH}?page=1&limit=1`,
				headers: { Authorization: `Bearer ${accessTokenFree}` },
			});
			expect(meCheck.statusCode).toBe(200); // free user can list qr-codes…

			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Free still blocked' },
				accessTokenFree,
			);
			expect(createResponse.statusCode).toBe(403); // …but cannot create API keys
		});
	});
});

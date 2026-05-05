import { container } from 'tsyringe';
import { type FastifyInstance } from 'fastify';
import { resetTestState, TEST_USER_PRO_ID } from '@/tests/shared/test-context';
import { ClerkApiKeysService } from '../../service/clerk-api-keys.service';
import db from '@/core/db';
import userSubscription from '@/modules/billing/domain/entities/user-subscription.entity';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { KeyCache } from '@/core/cache';
import {
	ALL_API_KEY_SCOPES,
	API_KEY_API_PATH,
	QR_CODE_API_PATH,
	createApiKeyRequest,
	getTestContext,
	listApiKeysRequest,
	revokeApiKeyRequest,
	updateApiKeyRequest,
} from './utils';

describe('api-key endpoints', () => {
	let testServer: FastifyInstance;
	let accessTokenFree: string;
	let accessToken2Free: string;
	let accessTokenPro: string;
	const createdApiKeyIds: string[] = [];
	let proSubscriptionId: string | null = null;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessTokenFree = ctx.accessToken;
		accessToken2Free = ctx.accessToken2;
		accessTokenPro = ctx.accessTokenPro;

		// Seed an active Pro subscription for the Pro test user so plan gating
		// resolves to PRO. The middleware caches plan lookups, so also flush the
		// cache to make sure subsequent requests see the seeded state.
		await db
			.delete(userSubscription)
			.where(eq(userSubscription.userId, TEST_USER_PRO_ID))
			.execute();

		proSubscriptionId = randomUUID();
		const now = new Date();
		const periodEnd = new Date();
		periodEnd.setDate(periodEnd.getDate() + 30);
		await db
			.insert(userSubscription)
			.values({
				id: proSubscriptionId,
				userId: TEST_USER_PRO_ID,
				stripeCustomerId: `cus_test_${randomUUID().slice(0, 8)}`,
				stripeSubscriptionId: `sub_test_${randomUUID().slice(0, 8)}`,
				stripePriceId: 'price_test_monthly',
				status: 'active',
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
				cancelAtPeriodEnd: false,
				gracePeriodEndsAt: null,
				proFeaturesDisabledAt: null,
				cancellationNotifiedAt: null,
				cancellationReminderSentAt: null,
				pastDueNotifiedAt: null,
				createdAt: now,
				updatedAt: now,
			})
			.execute();

		await container.resolve(KeyCache).flushAllCache();

		// Delete any pre-existing keys (active or revoked) from previous runs.
		// Clerk keeps revoked keys and blocks re-creating a key with the same
		// name + subject ("token_creation_conflict" 409), so we must fully
		// delete — not just revoke — to keep the tests hermetic across runs.
		const clerk = container.resolve(ClerkApiKeysService);
		try {
			const existing = await clerk.apiKeys.list({
				subject: TEST_USER_PRO_ID,
				includeInvalid: true,
			});
			await Promise.allSettled(existing.data.map((k) => clerk.apiKeys.delete(k.id)));
		} catch {
			// best-effort cleanup — proceed
		}
	});

	afterAll(async () => {
		// Hard-delete any keys created in this run so the next run starts clean.
		const clerk = container.resolve(ClerkApiKeysService);
		await Promise.allSettled(createdApiKeyIds.map((id) => clerk.apiKeys.delete(id)));

		if (proSubscriptionId) {
			await db.delete(userSubscription).where(eq(userSubscription.id, proSubscriptionId)).execute();
		}
	});

	describe('POST /api-key', () => {
		it('returns 401 without a bearer token', async () => {
			const response = await testServer.inject({
				method: 'POST',
				url: API_KEY_API_PATH,
				payload: { name: 'No auth', scopes: ALL_API_KEY_SCOPES },
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
				payload: { name: '', scopes: ALL_API_KEY_SCOPES },
			});
			expect(response.statusCode).toBe(400);
		});

		it('rejects creation without scopes (min 1 enforced)', async () => {
			const response = await testServer.inject({
				method: 'POST',
				url: API_KEY_API_PATH,
				headers: { Authorization: `Bearer ${accessTokenPro}` },
				payload: { name: 'Empty-scopes' },
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

		it('rejects a description longer than 255 chars', async () => {
			const response = await createApiKeyRequest(
				testServer,
				{ name: 'Bad desc', description: 'x'.repeat(256) },
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
					description: 'y'.repeat(255),
					expiresInDays: 365,
				},
				accessTokenPro,
			);
			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.payload);
			expect(body.name.length).toBe(64);
			expect(body.description.length).toBe(255);
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

	describe('Scope enforcement', () => {
		it('rejects a write call when the key only has read', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Read-only key', scopes: ['read'] },
				accessTokenPro,
			);
			const { id, secret } = JSON.parse(createResponse.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(id);

			// POST /tag — documented write endpoint with a simple body, good scope-check fixture.
			const tagCreate = await testServer.inject({
				method: 'POST',
				url: '/api/v1/tag',
				headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
				payload: { name: 'Test tag', color: '#ff0000' },
			});
			expect(tagCreate.statusCode).toBe(403);
			const body = JSON.parse(tagCreate.payload);
			expect(body.errorCode).toBe('INSUFFICIENT_SCOPE');
			expect(body.requiredScope).toBe('write');
			expect(body.grantedScopes).toEqual(['read']);
		});

		it('allows a read call when the key has read', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Read-only listing', scopes: ['read'] },
				accessTokenPro,
			);
			const { id, secret } = JSON.parse(createResponse.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(id);

			const listResponse = await testServer.inject({
				method: 'GET',
				url: `${QR_CODE_API_PATH}?page=1&limit=1`,
				headers: { Authorization: `Bearer ${secret}` },
			});
			expect(listResponse.statusCode).toBe(200);
		});

		it('rejects a delete call when the key has read+write+update but not delete', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'No-delete key', scopes: ['read', 'write', 'update'] },
				accessTokenPro,
			);
			const { id, secret } = JSON.parse(createResponse.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(id);

			const deleteResponse = await testServer.inject({
				method: 'DELETE',
				url: `${QR_CODE_API_PATH}/some-id-that-doesnt-matter`,
				headers: { Authorization: `Bearer ${secret}` },
			});
			expect(deleteResponse.statusCode).toBe(403);
			const body = JSON.parse(deleteResponse.payload);
			expect(body.errorCode).toBe('INSUFFICIENT_SCOPE');
			expect(body.requiredScope).toBe('delete');
		});

		it('hidden routes reject api_key auth with TOKEN_TYPE_NOT_ALLOWED', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Hidden-route probe', scopes: ALL_API_KEY_SCOPES },
				accessTokenPro,
			);
			const { id, secret } = JSON.parse(createResponse.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(id);

			// Hidden routes default to session-only — a fully-scoped API key still gets 403.
			const response = await testServer.inject({
				method: 'POST',
				url: '/api/v1/custom-domain/clear-default',
				headers: { Authorization: `Bearer ${secret}` },
			});
			expect(response.statusCode).toBe(403);
			expect(JSON.parse(response.payload).errorCode).toBe('TOKEN_TYPE_NOT_ALLOWED');
		});
	});

	describe('Token-type restriction (api_key cannot manage other keys)', () => {
		it('rejects api_key auth when calling POST /api-key', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Self-replicating attempt', scopes: ALL_API_KEY_SCOPES },
				accessTokenPro,
			);
			const { id, secret } = JSON.parse(createResponse.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(id);

			const attempt = await testServer.inject({
				method: 'POST',
				url: API_KEY_API_PATH,
				headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
				payload: {
					name: 'Should not exist',
					scopes: ALL_API_KEY_SCOPES,
				},
			});
			expect(attempt.statusCode).toBe(403);
			const body = JSON.parse(attempt.payload);
			expect(body.errorCode).toBe('TOKEN_TYPE_NOT_ALLOWED');
			expect(body.providedTokenType).toBe('api_key');
			expect(body.allowedTokenTypes).toEqual(['session_token']);
		});

		it('rejects api_key auth when calling GET /api-key (list)', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'List-attempt key', scopes: ALL_API_KEY_SCOPES },
				accessTokenPro,
			);
			const { id, secret } = JSON.parse(createResponse.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(id);

			const attempt = await listApiKeysRequest(testServer, secret);
			expect(attempt.statusCode).toBe(403);
			expect(JSON.parse(attempt.payload).errorCode).toBe('TOKEN_TYPE_NOT_ALLOWED');
		});

		it('rejects api_key auth when calling DELETE /api-key/:id (revoke)', async () => {
			const createA = await createApiKeyRequest(
				testServer,
				{ name: 'Mutual revoke A', scopes: ALL_API_KEY_SCOPES },
				accessTokenPro,
			);
			const { id: idA, secret: secretA } = JSON.parse(createA.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(idA);

			const createB = await createApiKeyRequest(
				testServer,
				{ name: 'Mutual revoke B', scopes: ALL_API_KEY_SCOPES },
				accessTokenPro,
			);
			const { id: idB } = JSON.parse(createB.payload) as { id: string; secret: string };
			createdApiKeyIds.push(idB);

			const attempt = await revokeApiKeyRequest(testServer, idB, secretA);
			expect(attempt.statusCode).toBe(403);
			expect(JSON.parse(attempt.payload).errorCode).toBe('TOKEN_TYPE_NOT_ALLOWED');
		});

		it('rejects api_key auth when calling PATCH /api-key/:id (update)', async () => {
			const createA = await createApiKeyRequest(
				testServer,
				{ name: 'Self-update attempt', scopes: ALL_API_KEY_SCOPES },
				accessTokenPro,
			);
			const { id, secret } = JSON.parse(createA.payload) as {
				id: string;
				secret: string;
			};
			createdApiKeyIds.push(id);

			const attempt = await updateApiKeyRequest(testServer, id, { scopes: ['read'] }, secret);
			expect(attempt.statusCode).toBe(403);
			expect(JSON.parse(attempt.payload).errorCode).toBe('TOKEN_TYPE_NOT_ALLOWED');
		});
	});

	describe('PATCH /api-key/:id (update flow)', () => {
		it('updates scopes, description, and reflects them in the list response', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Updatable key', scopes: ['read'], description: 'before' },
				accessTokenPro,
			);
			const { id } = JSON.parse(createResponse.payload) as { id: string };
			createdApiKeyIds.push(id);

			const update = await updateApiKeyRequest(
				testServer,
				id,
				{ scopes: ['read', 'write', 'update'], description: 'after' },
				accessTokenPro,
			);
			expect(update.statusCode).toBe(200);
			const updated = JSON.parse(update.payload);
			expect(updated.scopes).toEqual(['read', 'write', 'update']);
			expect(updated.description).toBe('after');

			const list = await listApiKeysRequest(testServer, accessTokenPro);
			const found = (JSON.parse(list.payload).data as Array<{ id: string; scopes: string[] }>).find(
				(k) => k.id === id,
			);
			expect(found?.scopes).toEqual(['read', 'write', 'update']);
		});

		it('returns 404 when updating a key that belongs to another user', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Cross-user probe', scopes: ALL_API_KEY_SCOPES },
				accessTokenPro,
			);
			const { id } = JSON.parse(createResponse.payload) as { id: string };
			createdApiKeyIds.push(id);

			// Free user tries to update Pro user's key — must fail.
			const attempt = await updateApiKeyRequest(
				testServer,
				id,
				{ scopes: ['read'] },
				accessTokenFree,
			);
			expect(attempt.statusCode).toBe(404);
		});

		it('rejects updating to empty scopes (min 1 enforced)', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'Empty-scopes probe', scopes: ALL_API_KEY_SCOPES },
				accessTokenPro,
			);
			const { id } = JSON.parse(createResponse.payload) as { id: string };
			createdApiKeyIds.push(id);

			const attempt = await updateApiKeyRequest(testServer, id, { scopes: [] }, accessTokenPro);
			expect(attempt.statusCode).toBe(400);
		});

		it('rejects an update with no fields', async () => {
			const createResponse = await createApiKeyRequest(
				testServer,
				{ name: 'No-op update probe', scopes: ALL_API_KEY_SCOPES },
				accessTokenPro,
			);
			const { id } = JSON.parse(createResponse.payload) as { id: string };
			createdApiKeyIds.push(id);

			const attempt = await updateApiKeyRequest(testServer, id, {}, accessTokenPro);
			expect(attempt.statusCode).toBe(400);
		});
	});
});

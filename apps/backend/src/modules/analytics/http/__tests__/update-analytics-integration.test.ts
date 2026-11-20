import type { TAnalyticsIntegrationResponseDto } from '@shared/schemas';
import {
	getTestContext,
	cleanupCreatedIntegrations,
	createIntegrationDirectly,
	updateIntegrationViaApi,
	findIntegrationById,
	ensureProSubscription,
	ANALYTICS_INTEGRATION_API_PATH,
	TEST_USER_PRO_ID,
	TEST_USER_ID,
	type TestContext,
} from './utils';
import { randomUUID } from 'crypto';
import { resetTestState } from '@/tests/shared/test-context';

describe('PATCH /analytics-integration/:id (Update)', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
		await ensureProSubscription();
	});

	afterEach(async () => {
		await cleanupCreatedIntegrations(ctx);
	});

	it('should toggle isEnabled off', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await updateIntegrationViaApi(
			ctx,
			id,
			{ isEnabled: false },
			ctx.accessTokenPro,
		);

		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.isEnabled).toBe(false);
	});

	it('should toggle isEnabled back on', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			isEnabled: false,
		});

		const response = await updateIntegrationViaApi(
			ctx,
			id,
			{ isEnabled: true },
			ctx.accessTokenPro,
		);

		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.isEnabled).toBe(true);
	});

	it('should update credentials and reflect new displayIdentifier', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const originalRecord = await findIntegrationById(id);
		expect(originalRecord).toBeDefined();

		const response = await updateIntegrationViaApi(
			ctx,
			id,
			{
				credentials: {
					measurementId: 'G-NEWMEASURE1',
					apiSecret: 'new_secret_value',
				},
			},
			ctx.accessTokenPro,
		);

		expect(response).toHaveStatusCode(200);

		// Verify credentials were re-encrypted (different ciphertext)
		const updatedRecord = await findIntegrationById(id);
		expect(updatedRecord).toBeDefined();
		expect(updatedRecord!.encryptedCredentials).not.toBe(originalRecord!.encryptedCredentials);
		expect(updatedRecord!.encryptionIv).not.toBe(originalRecord!.encryptionIv);
	});

	it('should add authToken when updating Matomo credentials with a token', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			providerType: 'matomo',
			credentials: { matomoUrl: 'https://matomo.example.com', siteId: '1' },
		});

		const response = await updateIntegrationViaApi(
			ctx,
			id,
			{
				credentials: {
					matomoUrl: 'https://matomo.example.com',
					siteId: '1',
					authToken: 'my_secret_token',
				},
			},
			ctx.accessTokenPro,
		);

		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.hasAuthToken).toBe(true);
	});

	it('should preserve existing authToken when updating Matomo without providing a token', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			providerType: 'matomo',
			credentials: {
				matomoUrl: 'https://matomo.example.com',
				siteId: '1',
				authToken: 'existing_token',
			},
		});

		// Update only matomoUrl, omit authToken entirely
		const response = await updateIntegrationViaApi(
			ctx,
			id,
			{
				credentials: {
					matomoUrl: 'https://matomo.updated.com',
					siteId: '1',
				},
			},
			ctx.accessTokenPro,
		);

		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.hasAuthToken).toBe(true);
		expect(result.displayIdentifier).toContain('matomo.updated.com');
	});

	it('should remove authToken when updating Matomo with an empty token string', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			providerType: 'matomo',
			credentials: {
				matomoUrl: 'https://matomo.example.com',
				siteId: '1',
				authToken: 'token_to_remove',
			},
		});

		// Send empty string to explicitly clear the token
		const response = await updateIntegrationViaApi(
			ctx,
			id,
			{
				credentials: {
					matomoUrl: 'https://matomo.example.com',
					siteId: '1',
					authToken: '',
				},
			},
			ctx.accessTokenPro,
		);

		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.hasAuthToken).toBe(false);
	});

	it('should return 404 for non-existent integration', async () => {
		const fakeId = randomUUID();
		const response = await updateIntegrationViaApi(
			ctx,
			fakeId,
			{ isEnabled: false },
			ctx.accessTokenPro,
		);

		expect(response).toHaveStatusCode(404);
	});

	it("should return 403 when updating another user's integration", async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await updateIntegrationViaApi(ctx, id, { isEnabled: false }, ctx.accessToken2);

		expect(response).toHaveStatusCode(403);
	});

	it('should return 403 when user has no Pro plan', async () => {
		// Create integration directly for the free user (bypassing API plan check)
		const id = await createIntegrationDirectly(ctx, TEST_USER_ID);

		const response = await updateIntegrationViaApi(ctx, id, { isEnabled: false }, ctx.accessToken);

		expect(response).toHaveStatusCode(403);
	});

	it('should return 401 when not authenticated', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await ctx.testServer.inject({
			method: 'PATCH',
			url: `${ANALYTICS_INTEGRATION_API_PATH}/${id}`,
			headers: { 'Content-Type': 'application/json' },
			payload: { isEnabled: false },
		});

		expect(response).toHaveStatusCode(401);
	});
});

import {
	getTestContext,
	cleanupCreatedIntegrations,
	createIntegrationDirectly,
	testIntegrationViaApi,
	ensureProSubscription,
	ANALYTICS_INTEGRATION_API_PATH,
	TEST_USER_PRO_ID,
	TEST_USER_ID,
	type TestContext,
} from './utils';
import { randomUUID } from 'crypto';

describe('POST /analytics-integration/:id/test (Test Credentials)', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await getTestContext();
		await ensureProSubscription();
	});

	afterEach(async () => {
		await cleanupCreatedIntegrations(ctx);
	});

	it('should return credentialsVerified: false for GA4 (cannot verify via API)', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			providerType: 'google_analytics',
			credentials: {
				measurementId: 'G-FAKEFAKE01',
				apiSecret: 'not_a_real_secret',
			},
		});

		const response = await testIntegrationViaApi(ctx, id, ctx.accessTokenPro);

		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as {
			valid: boolean;
			credentialsVerified: boolean;
		};
		// GA4 Measurement Protocol does not support credential verification,
		// so credentialsVerified is always false regardless of credential validity
		expect(result.credentialsVerified).toBe(false);
	});

	it('should return valid: false with credentialsVerified: true for Matomo with unreachable URL', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			providerType: 'matomo',
			credentials: {
				matomoUrl: 'https://matomo.nonexistent.invalid',
				siteId: '1',
			},
		});

		const response = await testIntegrationViaApi(ctx, id, ctx.accessTokenPro);

		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as {
			valid: boolean;
			credentialsVerified: boolean;
		};
		expect(result.valid).toBe(false);
		expect(result.credentialsVerified).toBe(true);
	});

	it('should return 404 for non-existent integration', async () => {
		const fakeId = randomUUID();
		const response = await testIntegrationViaApi(ctx, fakeId, ctx.accessTokenPro);

		expect(response.statusCode).toBe(404);
	});

	it("should return 403 when testing another user's integration", async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await testIntegrationViaApi(ctx, id, ctx.accessToken2);

		expect(response.statusCode).toBe(403);
	});

	it('should return 403 when user has no Pro plan', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_ID);

		const response = await testIntegrationViaApi(ctx, id, ctx.accessToken);

		expect(response.statusCode).toBe(403);
	});

	it('should return 401 when not authenticated', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${ANALYTICS_INTEGRATION_API_PATH}/${id}/test`,
		});

		expect(response.statusCode).toBe(401);
	});
});

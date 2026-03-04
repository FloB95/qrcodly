import type { TAnalyticsIntegrationResponseDto } from '@shared/schemas';
import {
	getTestContext,
	cleanupCreatedIntegrations,
	createIntegrationDirectly,
	listIntegrations,
	ANALYTICS_INTEGRATION_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('GET /analytics-integration (List)', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedIntegrations(ctx);
	});

	it('should return empty array when user has no integrations', async () => {
		const response = await listIntegrations(ctx, ctx.accessTokenPro);

		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto[];
		expect(result).toEqual([]);
	});

	it('should return the user integration', async () => {
		await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			providerType: 'google_analytics',
		});

		const response = await listIntegrations(ctx, ctx.accessTokenPro);

		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto[];
		expect(result).toHaveLength(1);
		expect(result[0].providerType).toBe('google_analytics');
		expect(result[0].isEnabled).toBe(true);
		expect(result[0].hasCredentials).toBe(true);
	});

	it('should not return other users integrations', async () => {
		await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			providerType: 'google_analytics',
		});

		// User 1 (non-pro, but listing should still work - it returns empty)
		const response = await listIntegrations(ctx, ctx.accessToken);

		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto[];
		expect(result).toHaveLength(0);
	});

	it('should not expose credential data in the response', async () => {
		await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await listIntegrations(ctx, ctx.accessTokenPro);

		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as Record<string, unknown>[];
		expect(result).toHaveLength(1);
		expect(result[0]).not.toHaveProperty('encryptedCredentials');
		expect(result[0]).not.toHaveProperty('encryptionIv');
		expect(result[0]).not.toHaveProperty('encryptionTag');
		expect(result[0]).not.toHaveProperty('credentials');
		expect(result[0]).toHaveProperty('hasCredentials', true);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'GET',
			url: ANALYTICS_INTEGRATION_API_PATH,
		});

		expect(response.statusCode).toBe(401);
	});
});

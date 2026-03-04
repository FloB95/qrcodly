import type { TAnalyticsIntegrationResponseDto } from '@shared/schemas';
import {
	getTestContext,
	cleanupIntegrationsForUser,
	ensureProSubscription,
	createIntegrationViaApi,
	createIntegrationDirectly,
	generateGA4CreateDto,
	generateMatomoCreateDto,
	ANALYTICS_INTEGRATION_API_PATH,
	TEST_USER_PRO_ID,
	TEST_USER_ID,
	type TestContext,
} from './utils';

describe('POST /analytics-integration (Create)', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await getTestContext();
		// Ensure pro user has an active subscription so plan checks pass
		await ensureProSubscription();
	});

	beforeEach(async () => {
		// Ensure a clean state before each test — delete all integrations for test users
		await cleanupIntegrationsForUser(TEST_USER_PRO_ID);
		await cleanupIntegrationsForUser(TEST_USER_ID);
	});

	it('should create a GA4 integration for a pro user', async () => {
		const dto = generateGA4CreateDto();
		const response = await createIntegrationViaApi(ctx, dto, ctx.accessTokenPro);

		expect(response.statusCode).toBe(201);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.id).toBeDefined();
		expect(result.providerType).toBe('google_analytics');
		expect(result.isEnabled).toBe(true);
		expect(result.hasCredentials).toBe(true);
		expect(result.displayIdentifier).toBeDefined();
		expect(result.lastError).toBeNull();
		expect(result.consecutiveFailures).toBe(0);

		// Track for cleanup
		ctx.createdIntegrationIds.push(result.id);
	});

	it('should create a Matomo integration for a pro user', async () => {
		const dto = generateMatomoCreateDto();
		const response = await createIntegrationViaApi(ctx, dto, ctx.accessTokenPro);

		expect(response.statusCode).toBe(201);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.providerType).toBe('matomo');
		expect(result.isEnabled).toBe(true);
		expect(result.hasCredentials).toBe(true);

		ctx.createdIntegrationIds.push(result.id);
	});

	it('should return displayIdentifier for GA4', async () => {
		const dto = generateGA4CreateDto();
		const response = await createIntegrationViaApi(ctx, dto, ctx.accessTokenPro);

		expect(response.statusCode).toBe(201);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.displayIdentifier).toMatch(/^G-/);

		ctx.createdIntegrationIds.push(result.id);
	});

	it('should not expose credentials in response', async () => {
		const dto = generateGA4CreateDto();
		const response = await createIntegrationViaApi(ctx, dto, ctx.accessTokenPro);

		expect(response.statusCode).toBe(201);

		const result = JSON.parse(response.payload) as Record<string, unknown>;
		expect(result.hasCredentials).toBe(true);
		// Ensure no credential data is leaked
		expect(result).not.toHaveProperty('encryptedCredentials');
		expect(result).not.toHaveProperty('encryptionIv');
		expect(result).not.toHaveProperty('encryptionTag');
		expect(result).not.toHaveProperty('credentials');

		ctx.createdIntegrationIds.push(result.id as string);
	});

	it('should reject creating a second integration (limit 1 per user)', async () => {
		await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			providerType: 'google_analytics',
		});

		const dto = generateMatomoCreateDto();
		const response = await createIntegrationViaApi(ctx, dto, ctx.accessTokenPro);

		expect(response.statusCode).toBe(403);
	});

	it('should return 403 for free plan users', async () => {
		const dto = generateGA4CreateDto();
		const response = await createIntegrationViaApi(ctx, dto, ctx.accessToken);

		expect(response.statusCode).toBe(403);
	});

	it('should return 401 when not authenticated', async () => {
		const dto = generateGA4CreateDto();
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: ANALYTICS_INTEGRATION_API_PATH,
			headers: { 'Content-Type': 'application/json' },
			payload: dto,
		});

		expect(response.statusCode).toBe(401);
	});

	it('should return 400 for invalid provider type', async () => {
		const dto = {
			providerType: 'invalid_provider',
			credentials: { foo: 'bar' },
		};
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: ANALYTICS_INTEGRATION_API_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${ctx.accessTokenPro}`,
			},
			payload: dto,
		});

		expect(response.statusCode).toBe(400);
	});

	it('should return 400 for missing credentials', async () => {
		const dto = {
			providerType: 'google_analytics',
		};
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: ANALYTICS_INTEGRATION_API_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${ctx.accessTokenPro}`,
			},
			payload: dto,
		});

		expect(response.statusCode).toBe(400);
	});

	it('should return 400 for Matomo with a random string as URL', async () => {
		const response = await createIntegrationViaApi(
			ctx,
			{ providerType: 'matomo', credentials: { matomoUrl: 'not-a-url', siteId: '1' } },
			ctx.accessTokenPro,
		);

		expect(response.statusCode).toBe(400);
	});

	it('should return 400 for Matomo with a URL missing the protocol', async () => {
		const response = await createIntegrationViaApi(
			ctx,
			{
				providerType: 'matomo',
				credentials: { matomoUrl: 'matomo.example.com', siteId: '1' },
			},
			ctx.accessTokenPro,
		);

		expect(response.statusCode).toBe(400);
	});

	it('should return 400 for Matomo with an empty site ID', async () => {
		const response = await createIntegrationViaApi(
			ctx,
			{
				providerType: 'matomo',
				credentials: { matomoUrl: 'https://matomo.example.com', siteId: '' },
			},
			ctx.accessTokenPro,
		);

		expect(response.statusCode).toBe(400);
	});

	it('should return 400 for GA4 with an invalid measurement ID', async () => {
		const response = await createIntegrationViaApi(
			ctx,
			{
				providerType: 'google_analytics',
				credentials: { measurementId: 'INVALID', apiSecret: 'secret' },
			},
			ctx.accessTokenPro,
		);

		expect(response.statusCode).toBe(400);
	});

	it('should return 400 for GA4 with an empty API secret', async () => {
		const response = await createIntegrationViaApi(
			ctx,
			{
				providerType: 'google_analytics',
				credentials: { measurementId: 'G-TEST123456', apiSecret: '' },
			},
			ctx.accessTokenPro,
		);

		expect(response.statusCode).toBe(400);
	});
});

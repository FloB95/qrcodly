import type { TCustomDomainListResponseDto } from '@shared/schemas';
import {
	getTestContext,
	releaseTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	listCustomDomains,
	generateCreateCustomDomainDto,
	CUSTOM_DOMAIN_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('GET /custom-domain (List Custom Domains)', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedDomains(ctx);
	});

	afterAll(async () => {
		await releaseTestContext();
	});

	it('should list custom domains for authenticated user', async () => {
		// Create a domain directly in DB
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		const response = await listCustomDomains(ctx, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TCustomDomainListResponseDto;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.pagination).toBeDefined();
		expect(result.pagination.total).toBeGreaterThanOrEqual(1);
	});

	it('should support pagination', async () => {
		const response = await listCustomDomains(ctx, ctx.accessTokenPro, 'page=1&limit=5');
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TCustomDomainListResponseDto;
		expect(result.pagination.page).toBe(1);
		expect(result.pagination.limit).toBe(5);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'GET',
			url: CUSTOM_DOMAIN_API_PATH,
		});

		expect(response.statusCode).toBe(401);
	});

	it('should only return domains owned by the user', async () => {
		// Create domain for pro user directly in DB
		const dto1 = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto1.domain, TEST_USER_PRO_ID);

		// List for pro user (should contain their domain)
		const response1 = await listCustomDomains(ctx, ctx.accessTokenPro);
		const result1 = JSON.parse(response1.payload) as TCustomDomainListResponseDto;

		// List for free user (should NOT contain pro user's domain)
		const response2 = await listCustomDomains(ctx, ctx.accessToken2);
		const result2 = JSON.parse(response2.payload) as TCustomDomainListResponseDto;

		// Pro user's list should contain their domain
		const proUserDomains = result1.data.map((d) => d.domain);
		// Free user's list should NOT contain pro user's domain
		const freeUserDomains = result2.data.map((d) => d.domain);

		expect(proUserDomains).toContain(dto1.domain.toLowerCase());
		expect(freeUserDomains).not.toContain(dto1.domain.toLowerCase());
	});
});

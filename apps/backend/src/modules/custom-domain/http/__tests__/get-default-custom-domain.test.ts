import type { TCustomDomainResponseDto } from '@shared/schemas';
import {
	getTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	getDefaultDomain,
	generateCreateCustomDomainDto,
	CUSTOM_DOMAIN_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('GET /custom-domain/default', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedDomains(ctx);
	});

	it('should return null when no default domain is set', async () => {
		const response = await getDefaultDomain(ctx, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload);
		expect(result).toBeNull();
	});

	it('should return the default domain when one is set', async () => {
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'active',
			ownershipStatus: 'verified',
			isDefault: true,
		});

		const response = await getDefaultDomain(ctx, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TCustomDomainResponseDto;
		expect(result).not.toBeNull();
		expect(result.domain).toBe(dto.domain.toLowerCase());
		expect(result.isDefault).toBe(true);
	});

	it('should only return the default domain for the authenticated user', async () => {
		// Create a default domain for pro user
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'active',
			ownershipStatus: 'verified',
			isDefault: true,
		});

		// Free user (accessToken2) should not see pro user's default
		const response = await getDefaultDomain(ctx, ctx.accessToken2);
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload);
		expect(result).toBeNull();
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'GET',
			url: `${CUSTOM_DOMAIN_API_PATH}/default`,
		});

		expect(response.statusCode).toBe(401);
	});
});

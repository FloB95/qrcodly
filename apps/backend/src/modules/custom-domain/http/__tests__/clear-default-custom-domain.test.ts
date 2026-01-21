import type { TCustomDomainResponseDto } from '@shared/schemas';
import {
	getTestContext,
	releaseTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	clearDefaultDomain,
	getDefaultDomain,
	generateCreateCustomDomainDto,
	CUSTOM_DOMAIN_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('POST /custom-domain/clear-default', () => {
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

	it('should clear the default domain', async () => {
		// Create a default domain
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'active',
			ownershipStatus: 'verified',
			isDefault: true,
		});

		// Verify it's set as default
		const beforeResponse = await getDefaultDomain(ctx, ctx.accessTokenPro);
		const beforeResult = JSON.parse(beforeResponse.payload) as TCustomDomainResponseDto;
		expect(beforeResult).not.toBeNull();
		expect(beforeResult.isDefault).toBe(true);

		// Clear the default
		const clearResponse = await clearDefaultDomain(ctx, ctx.accessTokenPro);
		expect(clearResponse.statusCode).toBe(200);

		const clearResult = JSON.parse(clearResponse.payload) as { success: boolean };
		expect(clearResult.success).toBe(true);

		// Verify it's cleared
		const afterResponse = await getDefaultDomain(ctx, ctx.accessTokenPro);
		const afterResult = JSON.parse(afterResponse.payload);
		expect(afterResult).toBeNull();
	});

	it('should return success even when no default is set', async () => {
		// No default domain exists
		const response = await clearDefaultDomain(ctx, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as { success: boolean };
		expect(result.success).toBe(true);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${CUSTOM_DOMAIN_API_PATH}/clear-default`,
		});

		expect(response.statusCode).toBe(401);
	});
});

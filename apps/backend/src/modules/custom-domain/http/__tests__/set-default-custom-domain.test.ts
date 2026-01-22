import type { TCustomDomainResponseDto } from '@shared/schemas';
import {
	getTestContext,
	releaseTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	setDefaultDomain,
	generateCreateCustomDomainDto,
	CUSTOM_DOMAIN_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('POST /custom-domain/:id/set-default', () => {
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

	it('should return 400 when trying to set non-verified domain as default', async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'initializing',
		});

		// Should fail because domain is not fully verified
		const response = await setDefaultDomain(ctx, domainId, ctx.accessTokenPro);
		expect(response.statusCode).toBe(400);

		const error = JSON.parse(response.payload) as { message: string };
		expect(error.message).toContain('not valid for use');
	});

	it("should return 403 when trying to set another user's domain as default", async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		const response = await setDefaultDomain(ctx, domainId, ctx.accessToken2);
		expect(response.statusCode).toBe(403);
	});

	it('should return 404 for non-existent domain', async () => {
		const response = await setDefaultDomain(
			ctx,
			'00000000-0000-0000-0000-000000000000',
			ctx.accessTokenPro,
		);
		expect(response.statusCode).toBe(404);
	});

	it('should set domain as default when fully verified', async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'active',
			ownershipStatus: 'verified',
			isEnabled: true,
			ownershipTxtVerified: true,
			cnameVerified: true,
		});

		const response = await setDefaultDomain(ctx, domainId, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TCustomDomainResponseDto;
		expect(result.isDefault).toBe(true);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${CUSTOM_DOMAIN_API_PATH}/some-id/set-default`,
		});

		expect(response.statusCode).toBe(401);
	});
});

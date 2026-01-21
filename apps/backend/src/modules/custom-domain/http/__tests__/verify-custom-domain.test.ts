import type { TCustomDomainResponseDto } from '@shared/schemas';
import {
	getTestContext,
	releaseTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	verifyCustomDomain,
	generateCreateCustomDomainDto,
	CUSTOM_DOMAIN_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('POST /custom-domain/:id/verify', () => {
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

	it('should return 200 with unverified status when DNS records are not set up', async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		// Verifying without DNS records returns 200 with verification status still false
		const response = await verifyCustomDomain(ctx, domainId, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const verifiedDomain = JSON.parse(response.payload) as TCustomDomainResponseDto;
		// Still in dns_verification phase since DNS isn't set up
		expect(verifiedDomain.verificationPhase).toBe('dns_verification');
		expect(verifiedDomain.ownershipTxtVerified).toBe(false);
		expect(verifiedDomain.cnameVerified).toBe(false);
	});

	it("should return 403 for another user's domain", async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		const response = await verifyCustomDomain(ctx, domainId, ctx.accessToken2);
		expect(response.statusCode).toBe(403);
	});

	it('should return 404 for non-existent domain', async () => {
		const response = await verifyCustomDomain(
			ctx,
			'00000000-0000-0000-0000-000000000000',
			ctx.accessTokenPro,
		);
		expect(response.statusCode).toBe(404);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${CUSTOM_DOMAIN_API_PATH}/some-id/verify`,
		});

		expect(response.statusCode).toBe(401);
	});
});

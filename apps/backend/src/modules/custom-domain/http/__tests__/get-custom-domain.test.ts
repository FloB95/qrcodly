import type { TCustomDomainResponseDto } from '@shared/schemas';
import {
	getTestContext,
	releaseTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	getCustomDomain,
	generateCreateCustomDomainDto,
	CUSTOM_DOMAIN_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('GET /custom-domain/:id (Get Custom Domain)', () => {
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

	it('should return custom domain by ID', async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		const response = await getCustomDomain(ctx, domainId, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const customDomainResponse = JSON.parse(response.payload) as TCustomDomainResponseDto;
		expect(customDomainResponse.id).toBe(domainId);
		expect(customDomainResponse.domain).toBe(dto.domain.toLowerCase());
	});

	it("should return 403 when accessing another user's domain", async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		const response = await getCustomDomain(ctx, domainId, ctx.accessToken2);
		expect(response.statusCode).toBe(403);
	});

	it('should return 404 for non-existent domain', async () => {
		const response = await getCustomDomain(
			ctx,
			'00000000-0000-0000-0000-000000000000',
			ctx.accessTokenPro,
		);
		expect(response.statusCode).toBe(404);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'GET',
			url: `${CUSTOM_DOMAIN_API_PATH}/some-id`,
		});

		expect(response.statusCode).toBe(401);
	});
});

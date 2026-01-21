import {
	getTestContext,
	releaseTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	deleteCustomDomainViaApi,
	getCustomDomain,
	generateCreateCustomDomainDto,
	CUSTOM_DOMAIN_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('DELETE /custom-domain/:id', () => {
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

	it('should delete custom domain and return 200 with deleted flag', async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		const response = await deleteCustomDomainViaApi(ctx, domainId, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as { deleted: boolean };
		expect(result.deleted).toBe(true);

		// Verify it's deleted
		const getResponse = await getCustomDomain(ctx, domainId, ctx.accessTokenPro);
		expect(getResponse.statusCode).toBe(404);
	});

	it("should return 403 when deleting another user's domain", async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		const response = await deleteCustomDomainViaApi(ctx, domainId, ctx.accessToken2);
		expect(response.statusCode).toBe(403);
	});

	it('should return 404 for non-existent domain', async () => {
		const response = await deleteCustomDomainViaApi(
			ctx,
			'00000000-0000-0000-0000-000000000000',
			ctx.accessTokenPro,
		);
		expect(response.statusCode).toBe(404);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'DELETE',
			url: `${CUSTOM_DOMAIN_API_PATH}/some-id`,
		});

		expect(response.statusCode).toBe(401);
	});
});

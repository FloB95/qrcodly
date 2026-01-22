import {
	getTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	getSetupInstructions,
	generateCreateCustomDomainDto,
	CUSTOM_DOMAIN_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('GET /custom-domain/:id/setup-instructions', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedDomains(ctx);
	});

	it('should return setup instructions for DNS verification phase', async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		const response = await getSetupInstructions(ctx, domainId, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const instructions = JSON.parse(response.payload) as {
			phase: 'dns_verification' | 'cloudflare_ssl';
			ownershipTxtVerified: boolean;
			cnameVerified: boolean;
			sslValidationRecord: { recordType: string; recordHost: string; recordValue: string } | null;
			ownershipValidationRecord: {
				recordType: string;
				recordHost: string;
				recordValue: string;
			} | null;
			cnameRecord: { recordType: string; recordHost: string; recordValue: string };
			instructions: string;
		};

		// New domain should be in dns_verification phase
		expect(instructions.phase).toBe('dns_verification');
		expect(instructions.ownershipTxtVerified).toBe(false);
		expect(instructions.cnameVerified).toBe(false);
		// CNAME and ownership TXT records should be provided
		expect(instructions.cnameRecord.recordType).toBe('CNAME');
		expect(instructions.ownershipValidationRecord).not.toBeNull();
		expect(instructions.ownershipValidationRecord?.recordType).toBe('TXT');
		// SSL validation should be null in dns_verification phase
		expect(instructions.sslValidationRecord).toBeNull();
		// Instructions text should be present
		expect(instructions.instructions).toBeDefined();
	});

	it('should return subdomain (not full domain) for CNAME record host', async () => {
		// Test with a multi-level subdomain like "links.example.com"
		const domainId = await createCustomDomainDirectly(ctx, 'links.example.com', TEST_USER_PRO_ID);

		const response = await getSetupInstructions(ctx, domainId, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const instructions = JSON.parse(response.payload) as {
			cnameRecord: { recordType: string; recordHost: string; recordValue: string };
		};

		// CNAME host should be just "links", not "links.example.com"
		// DNS providers auto-append the base domain
		expect(instructions.cnameRecord.recordHost).toBe('links');
	});

	it('should handle deeper subdomains correctly', async () => {
		// Test with a deeper subdomain like "app.links.example.com"
		const domainId = await createCustomDomainDirectly(
			ctx,
			'app.links.example.com',
			TEST_USER_PRO_ID,
		);

		const response = await getSetupInstructions(ctx, domainId, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const instructions = JSON.parse(response.payload) as {
			cnameRecord: { recordType: string; recordHost: string; recordValue: string };
		};

		// CNAME host should be "app.links" for deeper subdomains
		expect(instructions.cnameRecord.recordHost).toBe('app.links');
	});

	it("should return 403 for another user's domain", async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		const response = await getSetupInstructions(ctx, domainId, ctx.accessToken2);
		expect(response.statusCode).toBe(403);
	});

	it('should return 404 for non-existent domain', async () => {
		const response = await getSetupInstructions(
			ctx,
			'00000000-0000-0000-0000-000000000000',
			ctx.accessTokenPro,
		);
		expect(response.statusCode).toBe(404);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'GET',
			url: `${CUSTOM_DOMAIN_API_PATH}/some-id/setup-instructions`,
		});

		expect(response.statusCode).toBe(401);
	});
});

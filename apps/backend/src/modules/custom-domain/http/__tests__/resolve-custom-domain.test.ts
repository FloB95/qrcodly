import type { TResolveDomainResponseDto } from '@shared/schemas';
import {
	getTestContext,
	releaseTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	resolveDomain,
	generateCreateCustomDomainDto,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('GET /custom-domain/resolve', () => {
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

	it('should return isValid=true for verified domain with active SSL', async () => {
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'active',
			ownershipStatus: 'verified',
		});

		const response = await resolveDomain(ctx, dto.domain);
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TResolveDomainResponseDto;
		expect(result.domain).toBe(dto.domain.toLowerCase());
		expect(result.isValid).toBe(true);
		expect(result.sslStatus).toBe('active');
	});

	it('should return isValid=false for domain with non-active SSL', async () => {
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'pending_validation',
			ownershipStatus: 'verified',
		});

		const response = await resolveDomain(ctx, dto.domain);
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TResolveDomainResponseDto;
		expect(result.isValid).toBe(false);
	});

	it('should return isValid=false for non-existent domain', async () => {
		const response = await resolveDomain(ctx, 'non-existent.example.com');
		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TResolveDomainResponseDto;
		expect(result.isValid).toBe(false);
	});

	it('should work without authentication (public endpoint)', async () => {
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'active',
			ownershipStatus: 'verified',
		});

		// No auth header - should still work
		const response = await resolveDomain(ctx, dto.domain);
		expect(response.statusCode).toBe(200);
	});

	it('should return 400 for missing domain query parameter', async () => {
		const response = await ctx.testServer.inject({
			method: 'GET',
			url: '/api/v1/custom-domain/resolve',
		});

		expect(response.statusCode).toBe(400);
	});
});

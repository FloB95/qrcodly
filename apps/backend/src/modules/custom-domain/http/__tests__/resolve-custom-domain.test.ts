import type { TResolveDomainResponseDto } from '@shared/schemas';
import { resetTestState } from '@/tests/shared/test-context';
import {
	getTestContext,
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
		await resetTestState();
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedDomains(ctx);
	});

	it('should return isValid=true for fully verified domain', async () => {
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'active',
			ownershipStatus: 'verified',
			isEnabled: true,
			ownershipTxtVerified: true,
			cnameVerified: true,
		});

		const response = await resolveDomain(ctx, dto.domain);
		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as TResolveDomainResponseDto;
		expect(result.domain).toBe(dto.domain.toLowerCase());
		expect(result.isValid).toBe(true);
	});

	it('should return isValid=false for domain with non-active SSL', async () => {
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'pending_validation',
			ownershipStatus: 'verified',
		});

		const response = await resolveDomain(ctx, dto.domain);
		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as TResolveDomainResponseDto;
		expect(result.isValid).toBe(false);
	});

	it('should return isValid=false for non-existent domain', async () => {
		const response = await resolveDomain(ctx, 'non-existent.example.com');
		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as TResolveDomainResponseDto;
		expect(result.isValid).toBe(false);
	});

	it('should work without authentication (public endpoint)', async () => {
		const dto = generateCreateCustomDomainDto();
		await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			sslStatus: 'active',
			ownershipStatus: 'verified',
			isEnabled: true,
			ownershipTxtVerified: true,
			cnameVerified: true,
		});

		// No auth header - should still work
		const response = await resolveDomain(ctx, dto.domain);
		expect(response).toHaveStatusCode(200);
	});

	it('should return 400 for missing domain query parameter', async () => {
		const response = await ctx.testServer.inject({
			method: 'GET',
			url: '/api/v1/custom-domain/resolve',
		});

		expect(response).toHaveStatusCode(400);
	});
});

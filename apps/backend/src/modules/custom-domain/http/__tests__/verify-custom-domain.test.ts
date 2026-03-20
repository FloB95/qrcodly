import type { TCustomDomainResponseDto } from '@shared/schemas';
import { resetTestState } from '@/tests/shared/test-context';
import {
	getTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	verifyCustomDomain,
	generateCreateCustomDomainDto,
	CUSTOM_DOMAIN_API_PATH,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';
import {
	CloudflareApiError,
	CloudflareService,
	isRetryableCloudflareError,
} from '../../service/cloudflare.service';
import { container } from 'tsyringe';

describe('POST /custom-domain/:id/verify', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedDomains(ctx);
	});

	it('should return 200 with unverified status when DNS records are not set up', async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID);

		// Verifying without DNS records returns 200 with verification status still false
		const response = await verifyCustomDomain(ctx, domainId, ctx.accessTokenPro);
		expect(response).toHaveStatusCode(200);

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
		expect(response).toHaveStatusCode(403);
	});

	it('should return 404 for non-existent domain', async () => {
		const response = await verifyCustomDomain(
			ctx,
			'00000000-0000-0000-0000-000000000000',
			ctx.accessTokenPro,
		);
		expect(response).toHaveStatusCode(404);
	});

	it('should return 403 when domain is disabled', async () => {
		const dto = generateCreateCustomDomainDto();
		const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
			isEnabled: false,
		});

		const response = await verifyCustomDomain(ctx, domainId, ctx.accessTokenPro);
		expect(response).toHaveStatusCode(403);

		const error = JSON.parse(response.payload) as { message: string };
		expect(error.message).toContain('disabled');
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${CUSTOM_DOMAIN_API_PATH}/some-id/verify`,
		});

		expect(response).toHaveStatusCode(401);
	});

	describe('transient Cloudflare errors', () => {
		let cloudflareService: CloudflareService;

		beforeAll(() => {
			cloudflareService = container.resolve(CloudflareService);
		});

		it('should return 503 when Cloudflare returns a 5xx error during SSL verification', async () => {
			const dto = generateCreateCustomDomainDto();
			const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
				verificationPhase: 'cloudflare_ssl',
				ownershipTxtVerified: true,
				cnameVerified: true,
				ownershipStatus: 'verified',
			});

			// Set a cloudflareHostnameId so the use case tries to poll Cloudflare
			const { customDomain: customDomainTable } = await import('@/core/db/schemas');
			const { eq } = await import('drizzle-orm');
			const dbModule = await import('@/core/db');
			await dbModule.default
				.update(customDomainTable)
				.set({ cloudflareHostnameId: 'mock-cf-id' })
				.where(eq(customDomainTable.id, domainId));

			const spy = jest
				.spyOn(cloudflareService, 'getCustomHostname')
				.mockRejectedValue(new CloudflareApiError('Server Error', 502));

			const response = await verifyCustomDomain(ctx, domainId, ctx.accessTokenPro);
			expect(response).toHaveStatusCode(503);

			const error = JSON.parse(response.payload) as { message: string };
			expect(error.message).toContain('temporarily unavailable');
			expect(error.message).not.toContain('Cloudflare');

			spy.mockRestore();
		});

		it('should return 400 when Cloudflare returns a 4xx error during SSL verification', async () => {
			const dto = generateCreateCustomDomainDto();
			const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
				verificationPhase: 'cloudflare_ssl',
				ownershipTxtVerified: true,
				cnameVerified: true,
				ownershipStatus: 'verified',
			});

			const { customDomain: customDomainTable } = await import('@/core/db/schemas');
			const { eq } = await import('drizzle-orm');
			const dbModule = await import('@/core/db');
			await dbModule.default
				.update(customDomainTable)
				.set({ cloudflareHostnameId: 'mock-cf-id' })
				.where(eq(customDomainTable.id, domainId));

			const spy = jest
				.spyOn(cloudflareService, 'getCustomHostname')
				.mockRejectedValue(new CloudflareApiError('Not Found', 404));

			const response = await verifyCustomDomain(ctx, domainId, ctx.accessTokenPro);
			expect(response).toHaveStatusCode(400);

			spy.mockRestore();
		});
	});
});

describe('isRetryableCloudflareError', () => {
	it('should return true for 5xx CloudflareApiError', () => {
		expect(isRetryableCloudflareError(new CloudflareApiError('err', 500))).toBe(true);
		expect(isRetryableCloudflareError(new CloudflareApiError('err', 502))).toBe(true);
		expect(isRetryableCloudflareError(new CloudflareApiError('err', 504))).toBe(true);
	});

	it('should return true for error code 10001', () => {
		const error = new CloudflareApiError('auth fail', 400, [
			{ code: 10001, message: 'Unable to authenticate request' },
		]);
		expect(isRetryableCloudflareError(error)).toBe(true);
	});

	it('should return false for 4xx CloudflareApiError without code 10001', () => {
		expect(isRetryableCloudflareError(new CloudflareApiError('err', 400))).toBe(false);
		expect(isRetryableCloudflareError(new CloudflareApiError('err', 404))).toBe(false);
		expect(isRetryableCloudflareError(new CloudflareApiError('err', 422))).toBe(false);
	});

	it('should return false for non-CloudflareApiError', () => {
		expect(isRetryableCloudflareError(new Error('generic'))).toBe(false);
		expect(isRetryableCloudflareError(null)).toBe(false);
		expect(isRetryableCloudflareError('string')).toBe(false);
	});
});

import type { TResolveDomainResponseDto } from '@shared/schemas';
import { resetTestState } from '@/tests/shared/test-context';
import { container } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { randomUUID } from 'crypto';
import {
	getTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	deleteCustomDomainDirectly,
	resolveDomain,
	generateCreateCustomDomainDto,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

describe('GET /custom-domain/resolve - Redis Cache Invalidation', () => {
	let ctx: TestContext;
	let cache: KeyCache;
	let repository: CustomDomainRepository;

	const getResolveCacheKey = (domain: string) => `custom_domain_resolve:${domain.toLowerCase()}`;

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
		cache = container.resolve(KeyCache);
		repository = container.resolve(CustomDomainRepository);
	});

	afterEach(async () => {
		await cleanupCreatedDomains(ctx);
	});

	describe('cache population', () => {
		it('should write resolve result to Redis cache on first call', async () => {
			const dto = generateCreateCustomDomainDto();
			await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isEnabled: true,
				ownershipTxtVerified: true,
				cnameVerified: true,
			});

			const cachedBefore = await cache.get(getResolveCacheKey(dto.domain));
			expect(cachedBefore).toBeNull();

			await resolveDomain(ctx, dto.domain);

			const cachedAfter = await cache.get(getResolveCacheKey(dto.domain));
			expect(cachedAfter).not.toBeNull();
			expect(cachedAfter).not.toBe('__NOT_FOUND__');
		});

		it('should cache not-found domains with sentinel value', async () => {
			const domain = `nonexistent-${Date.now()}.example.com`;

			await resolveDomain(ctx, domain);

			const cached = await cache.get(getResolveCacheKey(domain));
			expect(cached).toBe('__NOT_FOUND__');
		});

		it('should serve cached result without hitting DB on second call', async () => {
			const dto = generateCreateCustomDomainDto();
			await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isEnabled: true,
				ownershipTxtVerified: true,
				cnameVerified: true,
			});

			// First call - populates cache
			const response1 = await resolveDomain(ctx, dto.domain);
			const result1 = JSON.parse(response1.payload) as TResolveDomainResponseDto;
			expect(result1.isValid).toBe(true);

			// Delete directly from DB (bypassing repository, so cache is NOT invalidated)
			const domainId = ctx.createdDomainIds[0]!;
			await deleteCustomDomainDirectly(domainId);
			ctx.createdDomainIds.length = 0;

			// Second call - should still return isValid=true from cache (stale)
			const response2 = await resolveDomain(ctx, dto.domain);
			const result2 = JSON.parse(response2.payload) as TResolveDomainResponseDto;
			expect(result2.isValid).toBe(true);
		});
	});

	describe('cache invalidation on update', () => {
		it('should return fresh data after domain is updated via repository', async () => {
			const dto = generateCreateCustomDomainDto();
			await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isEnabled: true,
				ownershipTxtVerified: true,
				cnameVerified: true,
			});

			// Resolve to populate cache
			const response1 = await resolveDomain(ctx, dto.domain);
			const result1 = JSON.parse(response1.payload) as TResolveDomainResponseDto;
			expect(result1.isValid).toBe(true);

			// Update domain via repository (disable it)
			const domainEntity = await repository.findOneByDomain(dto.domain);
			expect(domainEntity).toBeDefined();
			await repository.update(domainEntity!, { isEnabled: false });

			// Cache should be invalidated
			const cachedAfterUpdate = await cache.get(getResolveCacheKey(dto.domain));
			expect(cachedAfterUpdate).toBeNull();

			// Resolve again - should get fresh data
			const response2 = await resolveDomain(ctx, dto.domain);
			const result2 = JSON.parse(response2.payload) as TResolveDomainResponseDto;
			expect(result2.isValid).toBe(false);
		});

		it('should return fresh data after SSL status changes', async () => {
			const dto = generateCreateCustomDomainDto();
			await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isEnabled: true,
				ownershipTxtVerified: true,
				cnameVerified: true,
			});

			// Resolve - valid
			const response1 = await resolveDomain(ctx, dto.domain);
			expect(JSON.parse(response1.payload).isValid).toBe(true);

			// SSL expires
			const domainEntity = await repository.findOneByDomain(dto.domain);
			await repository.update(domainEntity!, { sslStatus: 'expired' });

			// Resolve - should now be invalid
			const response2 = await resolveDomain(ctx, dto.domain);
			expect(JSON.parse(response2.payload).isValid).toBe(false);
		});
	});

	describe('cache invalidation on delete', () => {
		it('should return isValid=false after domain is deleted via repository', async () => {
			const dto = generateCreateCustomDomainDto();
			await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isEnabled: true,
				ownershipTxtVerified: true,
				cnameVerified: true,
			});

			// Resolve to populate cache
			const response1 = await resolveDomain(ctx, dto.domain);
			expect(JSON.parse(response1.payload).isValid).toBe(true);

			// Delete via repository
			const domainEntity = await repository.findOneByDomain(dto.domain);
			await repository.delete(domainEntity!);

			// Remove from tracked IDs (already deleted)
			const idx = ctx.createdDomainIds.indexOf(domainEntity!.id);
			if (idx !== -1) ctx.createdDomainIds.splice(idx, 1);

			// Cache should be invalidated
			const cachedAfterDelete = await cache.get(getResolveCacheKey(dto.domain));
			expect(cachedAfterDelete).toBeNull();

			// Resolve - domain should no longer exist
			const response2 = await resolveDomain(ctx, dto.domain);
			expect(JSON.parse(response2.payload).isValid).toBe(false);
		});
	});

	describe('cache invalidation on create', () => {
		it('should invalidate not-found sentinel when domain is created via repository', async () => {
			const dto = generateCreateCustomDomainDto();

			// Resolve non-existent domain - caches not-found sentinel
			const response1 = await resolveDomain(ctx, dto.domain);
			expect(JSON.parse(response1.payload).isValid).toBe(false);

			const cachedBefore = await cache.get(getResolveCacheKey(dto.domain));
			expect(cachedBefore).toBe('__NOT_FOUND__');

			// Create domain via repository
			const id = randomUUID();
			await repository.create({
				id,
				domain: dto.domain,
				isDefault: false,
				isEnabled: true,
				createdBy: TEST_USER_PRO_ID,
				cloudflareHostnameId: null,
				sslStatus: 'active',
				ownershipStatus: 'verified',
				sslValidationTxtName: null,
				sslValidationTxtValue: null,
				ownershipValidationTxtName: `_qrcodly-verify.test`,
				ownershipValidationTxtValue: `qrcodly-verify-${id}`,
				verificationPhase: 'cloudflare_ssl',
				ownershipTxtVerified: true,
				cnameVerified: true,
				validationErrors: null,
			});
			ctx.createdDomainIds.push(id);

			// Not-found sentinel should be invalidated
			const cachedAfterCreate = await cache.get(getResolveCacheKey(dto.domain));
			expect(cachedAfterCreate).toBeNull();

			// Resolve again - should now find the entity in DB (not return sentinel)
			await resolveDomain(ctx, dto.domain);

			// Cache should now contain entity data, not sentinel
			const cachedAfterResolve = await cache.get(getResolveCacheKey(dto.domain));
			expect(cachedAfterResolve).not.toBeNull();
			expect(cachedAfterResolve).not.toBe('__NOT_FOUND__');

			const cachedEntity = JSON.parse(cachedAfterResolve as string);
			expect(cachedEntity.domain).toBe(dto.domain.toLowerCase());
		});
	});

	describe('cache invalidation on bulk operations', () => {
		it('should invalidate cache for all domains when disableAllByUserId is called', async () => {
			const domain1 = `bulk-disable-1-${randomUUID().slice(0, 8)}.example.com`;
			const domain2 = `bulk-disable-2-${randomUUID().slice(0, 8)}.example.com`;

			await createCustomDomainDirectly(ctx, domain1, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isEnabled: true,
				ownershipTxtVerified: true,
				cnameVerified: true,
			});
			await createCustomDomainDirectly(ctx, domain2, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isEnabled: true,
				ownershipTxtVerified: true,
				cnameVerified: true,
			});

			// Resolve both to populate cache
			const res1 = await resolveDomain(ctx, domain1);
			const res2 = await resolveDomain(ctx, domain2);
			expect(JSON.parse(res1.payload).isValid).toBe(true);
			expect(JSON.parse(res2.payload).isValid).toBe(true);

			// Disable all domains for the user
			await repository.disableAllByUserId(TEST_USER_PRO_ID);

			// Both caches should be invalidated
			expect(await cache.get(getResolveCacheKey(domain1))).toBeNull();
			expect(await cache.get(getResolveCacheKey(domain2))).toBeNull();

			// Both should now resolve as invalid
			const res3 = await resolveDomain(ctx, domain1);
			const res4 = await resolveDomain(ctx, domain2);
			expect(JSON.parse(res3.payload).isValid).toBe(false);
			expect(JSON.parse(res4.payload).isValid).toBe(false);
		});

		it('should invalidate cache for all domains when enableAllByUserId is called', async () => {
			const domain1 = `bulk-enable-1-${randomUUID().slice(0, 8)}.example.com`;
			const domain2 = `bulk-enable-2-${randomUUID().slice(0, 8)}.example.com`;

			// Create domains that are disabled
			await createCustomDomainDirectly(ctx, domain1, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isEnabled: false,
				ownershipTxtVerified: true,
				cnameVerified: true,
			});
			await createCustomDomainDirectly(ctx, domain2, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isEnabled: false,
				ownershipTxtVerified: true,
				cnameVerified: true,
			});

			// Resolve both - should be invalid (disabled)
			const res1 = await resolveDomain(ctx, domain1);
			const res2 = await resolveDomain(ctx, domain2);
			expect(JSON.parse(res1.payload).isValid).toBe(false);
			expect(JSON.parse(res2.payload).isValid).toBe(false);

			// Enable all domains for the user
			await repository.enableAllByUserId(TEST_USER_PRO_ID);

			// Both caches should be invalidated
			expect(await cache.get(getResolveCacheKey(domain1))).toBeNull();
			expect(await cache.get(getResolveCacheKey(domain2))).toBeNull();

			// Both should now resolve as valid
			const res3 = await resolveDomain(ctx, domain1);
			const res4 = await resolveDomain(ctx, domain2);
			expect(JSON.parse(res3.payload).isValid).toBe(true);
			expect(JSON.parse(res4.payload).isValid).toBe(true);
		});
	});
});

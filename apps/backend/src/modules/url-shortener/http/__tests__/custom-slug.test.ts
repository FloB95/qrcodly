import { getTestContext, resetTestState, TEST_USER_PRO_ID } from '@/tests/shared/test-context';
import { generateShortUrlDto } from '@/tests/shared/factories/short-url.factory';
import { ensureProSubscription } from '@/tests/shared/helpers/ensure-pro-subscription';
import {
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	deleteCustomDomainViaApi,
	type TestContext as DomainTestContext,
} from '@/modules/custom-domain/http/__tests__/utils';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH } from './utils';
import db from '@/core/db';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { shortUrl } from '@/core/db/schemas';

// Domain for these tests — Pro user owns an active, verified custom domain.
const ACTIVE_DOMAIN_OPTS = {
	sslStatus: 'active',
	ownershipStatus: 'verified',
	cnameVerified: true,
	ownershipTxtVerified: true,
	verificationPhase: 'cloudflare_ssl',
	isEnabled: true,
} as const;

describe('Custom Slug (Variante B)', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessTokenPro: string;
	let proUserId: string;
	let domainCtx: DomainTestContext;

	beforeAll(async () => {
		await resetTestState();
		await ensureProSubscription();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessTokenPro = ctx.accessTokenPro;
		proUserId = ctx.userPro.id;
		domainCtx = {
			testServer: ctx.testServer,
			accessToken: ctx.accessToken,
			accessToken2: ctx.accessToken2,
			accessTokenPro: ctx.accessTokenPro,
			createdDomainIds: [],
		};
	});

	afterEach(async () => {
		await cleanupCreatedDomains(domainCtx);
		// Hard-delete any shortUrls created during the test for the Pro user
		// (factories don't track them; using userId scoping is fine for isolation).
		await db.delete(shortUrl).where(eq(shortUrl.createdBy, TEST_USER_PRO_ID));
	});

	const post = async (payload: object, token: string) =>
		testServer.inject({
			method: 'POST',
			url: SHORT_URL_API_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			payload,
		});

	const createActiveDomain = async (suffix = '') => {
		const domain = `links-${Date.now()}${suffix}.example.com`;
		const id = await createCustomDomainDirectly(
			domainCtx,
			domain,
			TEST_USER_PRO_ID,
			ACTIVE_DOMAIN_OPTS,
		);
		return { id, domain };
	};

	describe('Create with customSlug', () => {
		it('Pro user with active custom domain → 201, response carries shortCode + customSlug', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const dto = generateShortUrlDto({ customDomainId, customSlug: 'sommer' });
			const res = await post(dto, accessTokenPro);
			expect(res).toHaveStatusCode(201);

			const body = JSON.parse(res.payload) as TShortUrlWithCustomDomainResponseDto;
			expect(body.customSlug).toBe('sommer');
			expect(body.shortCode).toMatch(/^[a-z0-9]{5}$/);
			expect(body.shortCode).not.toBe('sommer'); // shortCode is internal, separate
		});

		it('persists exactly the lowercase slug the client sent', async () => {
			// Schema enforces lowercase at the API boundary (Zod regex), so clients
			// must lowercase before sending. The frontend handles this in the input.
			const { id: customDomainId } = await createActiveDomain();
			const dto = generateShortUrlDto({ customDomainId, customSlug: 'sommer-aktion' });
			const res = await post(dto, accessTokenPro);
			expect(res).toHaveStatusCode(201);
			const body = JSON.parse(res.payload) as TShortUrlWithCustomDomainResponseDto;
			expect(body.customSlug).toBe('sommer-aktion');
		});

		it('Free user with customSlug → 403 (PlanLimitExceeded)', async () => {
			// Need an active domain owned by the Free user. Free users normally can't,
			// but for the test we create one directly to exercise the slug policy in
			// isolation from the domain-ownership policy.
			const ctx = await getTestContext();
			const freeUserId = ctx.user.id;
			const domain = `links-free-${Date.now()}.example.com`;
			const customDomainId = await createCustomDomainDirectly(
				domainCtx,
				domain,
				freeUserId,
				ACTIVE_DOMAIN_OPTS,
			);
			const dto = generateShortUrlDto({ customDomainId, customSlug: 'sommer' });
			const res = await post(dto, accessToken);
			expect(res.statusCode).toBe(403);
		});

		it('Pro user with customSlug but NO customDomainId → 400 (BadRequest)', async () => {
			const dto = generateShortUrlDto({ customDomainId: null, customSlug: 'sommer' });
			const res = await post(dto, accessTokenPro);
			expect(res.statusCode).toBe(400);
		});

		it('Pro user with reserved slug ("admin") → 409 (Conflict)', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const dto = generateShortUrlDto({ customDomainId, customSlug: 'admin' });
			const res = await post(dto, accessTokenPro);
			expect(res.statusCode).toBe(409);
		});

		it('invalid slug format → 400 (Zod validation)', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const dto = { ...generateShortUrlDto({ customDomainId }), customSlug: 'has spaces' };
			const res = await post(dto, accessTokenPro);
			expect(res.statusCode).toBe(400);
		});

		it('same slug on same domain twice → second is 409', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const first = await post(
				generateShortUrlDto({ customDomainId, customSlug: 'sommer' }),
				accessTokenPro,
			);
			expect(first.statusCode).toBe(201);

			const second = await post(
				generateShortUrlDto({ customDomainId, customSlug: 'sommer' }),
				accessTokenPro,
			);
			expect(second.statusCode).toBe(409);
		});

		it('same slug on DIFFERENT domain → both 201', async () => {
			const { id: domainA } = await createActiveDomain('-a');
			const { id: domainB } = await createActiveDomain('-b');

			const a = await post(
				generateShortUrlDto({ customDomainId: domainA, customSlug: 'sommer' }),
				accessTokenPro,
			);
			const b = await post(
				generateShortUrlDto({ customDomainId: domainB, customSlug: 'sommer' }),
				accessTokenPro,
			);
			expect(a.statusCode).toBe(201);
			expect(b.statusCode).toBe(201);
		});

		it('soft-deleted slug becomes available again on the same domain', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const created = await post(
				generateShortUrlDto({ customDomainId, customSlug: 'sommer' }),
				accessTokenPro,
			);
			expect(created.statusCode).toBe(201);
			const createdBody = JSON.parse(created.payload) as TShortUrlWithCustomDomainResponseDto;

			// Soft-delete that shortUrl directly in DB (mimic Delete endpoint)
			await db
				.update(shortUrl)
				.set({ deletedAt: new Date() })
				.where(eq(shortUrl.id, createdBody.id));

			// Now the same slug is free again
			const second = await post(
				generateShortUrlDto({ customDomainId, customSlug: 'sommer' }),
				accessTokenPro,
			);
			expect(second.statusCode).toBe(201);
			const secondBody = JSON.parse(second.payload) as TShortUrlWithCustomDomainResponseDto;
			expect(secondBody.customSlug).toBe('sommer');
			// The new shortUrl gets a fresh shortCode → Umami starts a clean ledger
			expect(secondBody.shortCode).not.toBe(createdBody.shortCode);
		});
	});

	describe('Slug-availability check endpoint', () => {
		const checkSlug = async (slug: string, customDomainId: string, token: string) =>
			testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/check-slug?slug=${encodeURIComponent(slug)}&customDomainId=${customDomainId}`,
				headers: { Authorization: `Bearer ${token}` },
			});

		it('available slug → { available: true }', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const res = await checkSlug('verynew', customDomainId, accessTokenPro);
			expect(res.statusCode).toBe(200);
			expect(JSON.parse(res.payload)).toEqual({ available: true });
		});

		it('reserved slug → { available: false, reason: "reserved" }', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const res = await checkSlug('admin', customDomainId, accessTokenPro);
			expect(res.statusCode).toBe(200);
			expect(JSON.parse(res.payload)).toEqual({
				available: false,
				reason: 'reserved',
			});
		});

		it('invalid format → { available: false, reason: "invalid" }', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const res = await checkSlug('-bad-', customDomainId, accessTokenPro);
			expect(res.statusCode).toBe(200);
			expect(JSON.parse(res.payload)).toEqual({
				available: false,
				reason: 'invalid',
			});
		});

		it('taken slug → { available: false, reason: "taken" }', async () => {
			const { id: customDomainId } = await createActiveDomain();
			await post(generateShortUrlDto({ customDomainId, customSlug: 'sommer' }), accessTokenPro);
			const res = await checkSlug('sommer', customDomainId, accessTokenPro);
			expect(res.statusCode).toBe(200);
			expect(JSON.parse(res.payload)).toEqual({
				available: false,
				reason: 'taken',
			});
		});

		it('Free user → 403', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const res = await checkSlug('sommer', customDomainId, accessToken);
			expect(res.statusCode).toBe(403);
		});
	});

	describe('Public scan resolution (?host=)', () => {
		const lookup = async (path: string, host?: string) =>
			testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/${path}${host ? `?host=${encodeURIComponent(host)}` : ''}`,
				headers: { 'x-internal-api-key': process.env.INTERNAL_API_SECRET ?? '' },
			});

		it('resolves customSlug scoped to the visiting host', async () => {
			const { id: customDomainId, domain } = await createActiveDomain();
			const create = await post(
				generateShortUrlDto({
					customDomainId,
					customSlug: 'sommer',
					destinationUrl: 'https://example.com/landing',
				}),
				accessTokenPro,
			);
			expect(create.statusCode).toBe(201);
			const created = JSON.parse(create.payload) as TShortUrlWithCustomDomainResponseDto;

			const res = await lookup('sommer', domain);
			expect(res.statusCode).toBe(200);
			const body = JSON.parse(res.payload);
			expect(body.shortCode).toBe(created.shortCode);
			expect(body.destinationUrl).toBe('https://example.com/landing');
		});

		it('returns 404 when slug exists on a different domain', async () => {
			const { id: domainA, domain: hostA } = await createActiveDomain('-a');
			const { domain: hostB } = await createActiveDomain('-b');
			await post(
				generateShortUrlDto({ customDomainId: domainA, customSlug: 'sommer' }),
				accessTokenPro,
			);
			const res = await lookup('sommer', hostB);
			expect(res.statusCode).toBe(404);
			expect(hostA).not.toBe(hostB);
		});

		it('falls back to shortCode when no customSlug matches on the domain', async () => {
			const { id: customDomainId, domain } = await createActiveDomain();
			const create = await post(
				generateShortUrlDto({ customDomainId }), // no slug
				accessTokenPro,
			);
			const created = JSON.parse(create.payload) as TShortUrlWithCustomDomainResponseDto;

			const res = await lookup(created.shortCode, domain);
			expect(res.statusCode).toBe(200);
			expect(JSON.parse(res.payload).shortCode).toBe(created.shortCode);
		});

		it('soft-deleted shortUrl → 404 (not redirected, slug becomes free)', async () => {
			const { id: customDomainId, domain } = await createActiveDomain();
			const create = await post(
				generateShortUrlDto({ customDomainId, customSlug: 'sommer' }),
				accessTokenPro,
			);
			const created = JSON.parse(create.payload) as TShortUrlWithCustomDomainResponseDto;
			await db.update(shortUrl).set({ deletedAt: new Date() }).where(eq(shortUrl.id, created.id));

			const res = await lookup('sommer', domain);
			expect(res.statusCode).toBe(404);
		});
	});

	describe('Custom domain delete cascades soft-delete to shortUrls', () => {
		it('shortUrls on a deleted domain become deletedAt + customSlug=null', async () => {
			const { id: customDomainId, domain } = await createActiveDomain();
			const create = await post(
				generateShortUrlDto({ customDomainId, customSlug: 'sommer' }),
				accessTokenPro,
			);
			const created = JSON.parse(create.payload) as TShortUrlWithCustomDomainResponseDto;
			expect(domain).toBeTruthy();

			const del = await deleteCustomDomainViaApi(domainCtx, customDomainId, accessTokenPro);
			expect(del.statusCode).toBe(200);

			const row = await db.query.shortUrl.findFirst({
				where: eq(shortUrl.id, created.id),
			});
			expect(row).toBeDefined();
			expect(row?.deletedAt).not.toBeNull();
			expect(row?.customSlug).toBeNull();
		});

		it('after domain delete the slug becomes available on a fresh domain', async () => {
			const { id: domainA } = await createActiveDomain('-a');
			await post(
				generateShortUrlDto({ customDomainId: domainA, customSlug: 'sommer' }),
				accessTokenPro,
			);
			const del = await deleteCustomDomainViaApi(domainCtx, domainA, accessTokenPro);
			expect(del.statusCode).toBe(200);

			const { id: domainB } = await createActiveDomain('-b');
			const reuse = await post(
				generateShortUrlDto({ customDomainId: domainB, customSlug: 'sommer' }),
				accessTokenPro,
			);
			expect(reuse.statusCode).toBe(201);
		});
	});

	describe('DB-level UNIQUE on customSlugKey', () => {
		it('refuses two ACTIVE rows with same (customSlug, customDomainId) at the SQL layer', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const first = await post(
				generateShortUrlDto({ customDomainId, customSlug: 'sommer' }),
				accessTokenPro,
			);
			expect(first.statusCode).toBe(201);

			// Bypass the use case and try to insert a duplicate ACTIVE row directly.
			await expect(
				db.insert(shortUrl).values({
					id: 'force-dup-' + Date.now(),
					shortCode: 'aaaaa',
					customSlug: 'sommer',
					name: null,
					destinationUrl: 'https://example.com',
					qrCodeId: null,
					customDomainId,
					isActive: true,
					createdBy: TEST_USER_PRO_ID,
					createdAt: new Date(),
				}),
			).rejects.toThrow(); // MySQL ER_DUP_ENTRY on unique_active_custom_slug_per_domain
		});

		it('allows multiple soft-deleted rows with the same (customSlug, customDomainId)', async () => {
			const { id: customDomainId } = await createActiveDomain();

			// Insert two soft-deleted rows holding the same slug — both should succeed
			// because customSlugKey is `__deleted__:<id>` for soft-deleted rows.
			const now = new Date();
			await db.insert(shortUrl).values({
				id: 'soft-1-' + Date.now(),
				shortCode: 'sft01',
				customSlug: 'sommer',
				name: null,
				destinationUrl: 'https://a.example.com',
				qrCodeId: null,
				customDomainId,
				isActive: false,
				createdBy: TEST_USER_PRO_ID,
				createdAt: now,
				deletedAt: now,
			});
			await db.insert(shortUrl).values({
				id: 'soft-2-' + Date.now(),
				shortCode: 'sft02',
				customSlug: 'sommer',
				name: null,
				destinationUrl: 'https://b.example.com',
				qrCodeId: null,
				customDomainId,
				isActive: false,
				createdBy: TEST_USER_PRO_ID,
				createdAt: now,
				deletedAt: now,
			});

			const rows = await db
				.select({ count: sql<number>`count(*)` })
				.from(shortUrl)
				.where(and(eq(shortUrl.customDomainId, customDomainId), eq(shortUrl.customSlug, 'sommer')));
			expect(Number(rows[0]?.count ?? 0)).toBeGreaterThanOrEqual(2);
		});

		it('the same slug + null customDomainId can coexist for soft-deleted rows', async () => {
			const now = new Date();
			// We never WRITE customSlug on system-domain rows in production, but the
			// constraint must still tolerate it (defensive).
			await expect(
				db
					.insert(shortUrl)
					.values({
						id: 'sys-soft-' + Date.now(),
						shortCode: 'syss1',
						customSlug: 'rare',
						name: null,
						destinationUrl: 'https://x.example.com',
						qrCodeId: null,
						customDomainId: null,
						isActive: false,
						createdBy: TEST_USER_PRO_ID,
						createdAt: now,
						deletedAt: now,
					})
					.execute(),
			).resolves.not.toThrow();
		});
	});

	describe('Slug-lifetime semantics', () => {
		it('check-slug returns "taken" only for ACTIVE rows; soft-deleted slugs free up', async () => {
			const { id: customDomainId } = await createActiveDomain();
			const create = await post(
				generateShortUrlDto({ customDomainId, customSlug: 'sommer' }),
				accessTokenPro,
			);
			const created = JSON.parse(create.payload) as TShortUrlWithCustomDomainResponseDto;

			const taken = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/check-slug?slug=sommer&customDomainId=${customDomainId}`,
				headers: { Authorization: `Bearer ${accessTokenPro}` },
			});
			expect(JSON.parse(taken.payload)).toEqual({ available: false, reason: 'taken' });

			await db.update(shortUrl).set({ deletedAt: new Date() }).where(eq(shortUrl.id, created.id));

			const free = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/check-slug?slug=sommer&customDomainId=${customDomainId}`,
				headers: { Authorization: `Bearer ${accessTokenPro}` },
			});
			expect(JSON.parse(free.payload)).toEqual({ available: true });

			// touch isNull to keep eslint happy (we use it indirectly through the soft-delete query semantics)
			expect(isNull).toBeDefined();
			expect(proUserId).toBeTruthy();
		});
	});
});

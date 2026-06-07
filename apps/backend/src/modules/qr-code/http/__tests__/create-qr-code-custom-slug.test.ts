import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { resetTestState, TEST_USER_ID, TEST_USER_PRO_ID } from '@/tests/shared/test-context';
import { ensureProSubscription } from '@/tests/shared/helpers/ensure-pro-subscription';
import {
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	type TestContext as DomainTestContext,
} from '@/modules/custom-domain/http/__tests__/utils';
import db from '@/core/db';
import { eq } from 'drizzle-orm';
import { shortUrl } from '@/core/db/schemas';
import { qrCode } from '@/core/db/schemas';
import { generateDynamicUrlQrCodeDto, createQrCodeRequest, getTestContext } from './utils';

const ACTIVE_DOMAIN_OPTS = {
	sslStatus: 'active',
	ownershipStatus: 'verified',
	cnameVerified: true,
	ownershipTxtVerified: true,
	verificationPhase: 'cloudflare_ssl',
	isEnabled: true,
	isDefault: true,
} as const;

describe('Create QR Code with custom slug (Variante B)', () => {
	let testServer: FastifyInstance;
	let accessTokenPro: string;
	let accessToken: string;
	let domainCtx: DomainTestContext;

	beforeAll(async () => {
		await resetTestState();
		await ensureProSubscription();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessTokenPro = ctx.accessTokenPro;
		accessToken = ctx.accessToken;
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
		await db.delete(shortUrl).where(eq(shortUrl.createdBy, TEST_USER_PRO_ID));
		await db.delete(qrCode).where(eq(qrCode.createdBy, TEST_USER_PRO_ID));
	});

	const createWith = (overrides: Partial<TCreateQrCodeDto>, token = accessTokenPro) => {
		const base = generateDynamicUrlQrCodeDto();
		return createQrCodeRequest(testServer, { ...base, ...overrides }, token);
	};

	it('Pro user with default custom domain → QR is wired up with the chosen slug', async () => {
		await createCustomDomainDirectly(
			domainCtx,
			`links-qr-${Date.now()}.example.com`,
			TEST_USER_PRO_ID,
			ACTIVE_DOMAIN_OPTS,
		);

		const res = await createWith({ customSlug: 'sommer' });
		expect(res.statusCode).toBe(201);
		const body = JSON.parse(res.payload) as TQrCodeWithRelationsResponseDto;

		// shortUrl row should now carry both the system shortCode and the customSlug
		const row = await db.query.shortUrl.findFirst({
			where: eq(shortUrl.qrCodeId, body.id),
		});
		expect(row?.customSlug).toBe('sommer');
		expect(row?.shortCode).toMatch(/^[a-z0-9]{5}$/);
	});

	it('Pro user without a default custom domain → 400', async () => {
		const res = await createWith({ customSlug: 'sommer' });
		expect(res.statusCode).toBe(400);
	});

	it('Free user with customSlug → 403', async () => {
		// Need an active default custom domain for the Free user, otherwise the
		// missing-domain check triggers first and returns 400 instead of 403.
		await createCustomDomainDirectly(
			domainCtx,
			`links-free-${Date.now()}.example.com`,
			TEST_USER_ID,
			ACTIVE_DOMAIN_OPTS,
		);
		const res = await createWith({ customSlug: 'sommer' }, accessToken);
		expect(res.statusCode).toBe(403);
	});

	it('reserved slug → 409', async () => {
		await createCustomDomainDirectly(
			domainCtx,
			`links-qr-${Date.now()}.example.com`,
			TEST_USER_PRO_ID,
			ACTIVE_DOMAIN_OPTS,
		);
		const res = await createWith({ customSlug: 'admin' });
		expect(res.statusCode).toBe(409);
	});

	it('Pro user without customSlug → 201 (slug is optional)', async () => {
		await createCustomDomainDirectly(
			domainCtx,
			`links-qr-${Date.now()}.example.com`,
			TEST_USER_PRO_ID,
			ACTIVE_DOMAIN_OPTS,
		);
		const res = await createWith({});
		expect(res.statusCode).toBe(201);
		const body = JSON.parse(res.payload) as TQrCodeWithRelationsResponseDto;
		const row = await db.query.shortUrl.findFirst({
			where: eq(shortUrl.qrCodeId, body.id),
		});
		expect(row?.customSlug).toBeNull();
	});

	it('static QR ignores customSlug (not dynamic)', async () => {
		// Static URL QR doesn't go through ShortUrlStrategyService at all,
		// so customSlug is silently dropped — no error, no slug set.
		const res = await createWith({
			content: { type: 'url', data: { url: 'https://example.com', isDynamic: false } },
			customSlug: 'sommer',
		});
		expect(res.statusCode).toBe(201);
	});
});

import {
	TEST_USER_ID,
	TEST_USER_2_ID,
	getTestContext,
	resetTestState,
} from '@/tests/shared/test-context';
import db from '@/core/db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import shortUrl from '../../domain/entities/short-url.entity';
import urlSafetyIncident from '../../domain/entities/url-safety-incident.entity';
import userSafetyStanding from '../../domain/entities/user-safety-standing.entity';
import type { FastifyInstance } from 'fastify';
import type { TSafetyIncidentListResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, createShortUrl } from './utils';
import { createQrCodeRequest, generateQrCodeDto } from '@/modules/qr-code/http/__tests__/utils';

describe('safety incidents', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	beforeEach(async () => {
		// The Clerk test users are shared across suites and resetTestState only runs once per suite,
		// so both safety tables have to start empty for every case — otherwise findings accumulate and
		// the counts drift.
		await db.delete(urlSafetyIncident).execute();
		await db
			.delete(userSafetyStanding)
			.where(eq(userSafetyStanding.userId, TEST_USER_ID))
			.execute();
		await db
			.delete(userSafetyStanding)
			.where(eq(userSafetyStanding.userId, TEST_USER_2_ID))
			.execute();
		// blockedCount reads short_url, so links blocked by an earlier case have to be released too
		await db
			.update(shortUrl)
			.set({ safetyStatus: 'clean', safetyBlockedAt: null, safetyThreatTypes: null })
			.where(eq(shortUrl.safetyStatus, 'blocked'))
			.execute();
	});

	const seedIncident = async (
		userId: string,
		shortUrlId: string | null,
		overrides: Partial<typeof urlSafetyIncident.$inferInsert> = {},
	) => {
		const row = {
			id: randomUUID(),
			userId,
			shortUrlId,
			destinationHost: 'phish.example.com',
			threatTypes: 'SOCIAL_ENGINEERING',
			source: 'recheck' as const,
			action: 'blocked' as const,
			countedAsOffence: true,
			acknowledgedAt: null,
			resolvedAt: null,
			createdAt: new Date(),
			...overrides,
		};
		await db.insert(urlSafetyIncident).values(row).execute();
		return row;
	};

	const listRequest = (token: string) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/safety-incidents`,
			headers: { Authorization: `Bearer ${token}` },
		});

	const acknowledgeRequest = (token: string) =>
		testServer.inject({
			method: 'POST',
			url: `${SHORT_URL_API_PATH}/safety-incidents/acknowledge`,
			headers: { Authorization: `Bearer ${token}` },
		});

	const parseList = (payload: string) => JSON.parse(payload) as TSafetyIncidentListResponseDto;

	it('requires authentication', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/safety-incidents`,
		});
		expect(response).toHaveStatusCode(401);
	});

	it('returns an empty, well-formed payload when there is nothing to report', async () => {
		const response = await listRequest(accessToken);

		expect(response).toHaveStatusCode(200);
		const body = parseList(response.payload);
		expect(body.incidents).toEqual([]);
		expect(body.blockedCount).toBe(0);
		expect(body.warningActive).toBe(false);
	});

	it('returns an open incident enriched with the affected link', async () => {
		const created = await createShortUrl(testServer, accessToken);
		await db
			.update(shortUrl)
			.set({ isActive: false, safetyStatus: 'blocked', safetyBlockedAt: new Date() })
			.where(eq(shortUrl.id, created.id))
			.execute();
		await seedIncident(TEST_USER_ID, created.id);

		const body = parseList((await listRequest(accessToken)).payload);

		expect(body.incidents).toHaveLength(1);
		expect(body.incidents[0]).toMatchObject({
			shortUrlId: created.id,
			shortCode: created.shortCode,
			destinationHost: 'phish.example.com',
			source: 'recheck',
			action: 'blocked',
		});
		expect(body.blockedCount).toBe(1);
	});

	it.each(['shadow', 'rejected'] as const)(
		'does not surface a %s finding — nothing was actually blocked',
		async (action) => {
			// The banner headline says "links were blocked". A rejected write never produced a link and
			// a shadow finding is an observation we deliberately did not act on, so neither belongs
			// there — surfacing them made the count disagree with what the CTA then listed.
			await seedIncident(TEST_USER_ID, null, { action });

			const body = parseList((await listRequest(accessToken)).payload);

			expect(body.incidents).toEqual([]);
		},
	);

	it('splits blocked links into standalone and QR-linked', async () => {
		// The short URL list is always queried with standalone=true, so a blocked dynamic-QR link is
		// only findable under QR codes. One combined number promised rows the list could not show.
		const standalone = await createShortUrl(testServer, accessToken);

		// a dynamic QR code gets its own short URL through the url strategy — the realistic case
		const dto = generateQrCodeDto();
		const qrResponse = await createQrCodeRequest(
			testServer,
			{ ...dto, content: { type: 'url', data: { url: 'https://example.com', isDynamic: true } } },
			accessToken,
		);
		expect(qrResponse).toHaveStatusCode(201);
		const qrCode = JSON.parse(qrResponse.payload) as { id: string };

		const [qrLinked] = await db
			.select()
			.from(shortUrl)
			.where(eq(shortUrl.qrCodeId, qrCode.id))
			.execute();
		expect(qrLinked).toBeDefined();

		for (const id of [standalone.id, qrLinked.id]) {
			await db
				.update(shortUrl)
				.set({ isActive: false, safetyStatus: 'blocked', safetyBlockedAt: new Date() })
				.where(eq(shortUrl.id, id))
				.execute();
		}

		const body = parseList((await listRequest(accessToken)).payload);

		expect(body.blockedCount).toBe(2);
		expect(body.blockedStandaloneCount).toBe(1);
		expect(body.blockedQrCodeCount).toBe(1);
	});

	it('never exposes a full destination URL, only the hostname', async () => {
		await seedIncident(TEST_USER_ID, null);

		const response = await listRequest(accessToken);

		expect(response.payload).not.toContain('/login');
		expect(response.payload).toContain('phish.example.com');
		const body = parseList(response.payload);
		expect(Object.keys(body.incidents[0])).not.toContain('destinationUrl');
	});

	it('does not leak another user’s incidents', async () => {
		await seedIncident(TEST_USER_2_ID, null, { destinationHost: 'other-user.example.com' });

		const body = parseList((await listRequest(accessToken)).payload);

		expect(body.incidents).toHaveLength(0);
	});

	it('reports warningActive once the account has been warned', async () => {
		await db
			.insert(userSafetyStanding)
			.values({
				userId: TEST_USER_ID,
				offenceCount: 1,
				firstOffenceAt: new Date(),
				lastOffenceAt: new Date(),
				warnedAt: new Date(),
				createdAt: new Date(),
			})
			.execute();

		expect(parseList((await listRequest(accessToken)).payload).warningActive).toBe(true);
	});

	it('does not report warningActive for a warning that fell out of the window', async () => {
		const longAgo = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
		await db
			.insert(userSafetyStanding)
			.values({
				userId: TEST_USER_ID,
				offenceCount: 1,
				firstOffenceAt: longAgo,
				lastOffenceAt: longAgo,
				warnedAt: longAgo,
				createdAt: longAgo,
			})
			.execute();

		expect(parseList((await listRequest(accessToken)).payload).warningActive).toBe(false);
	});

	it('acknowledging hides the incident but keeps the block', async () => {
		const created = await createShortUrl(testServer, accessToken);
		await db
			.update(shortUrl)
			.set({ isActive: false, safetyStatus: 'blocked' })
			.where(eq(shortUrl.id, created.id))
			.execute();
		await seedIncident(TEST_USER_ID, created.id);

		const ack = await acknowledgeRequest(accessToken);
		expect(ack).toHaveStatusCode(200);
		expect((JSON.parse(ack.payload) as { acknowledged: number }).acknowledged).toBe(1);

		const body = parseList((await listRequest(accessToken)).payload);
		expect(body.incidents).toHaveLength(0);
		// dismissing the banner is not the same as lifting the block
		expect(body.blockedCount).toBe(1);
	});

	it('acknowledging twice is a no-op', async () => {
		await seedIncident(TEST_USER_ID, null);

		await acknowledgeRequest(accessToken);
		const second = await acknowledgeRequest(accessToken);

		expect(second).toHaveStatusCode(200);
		expect((JSON.parse(second.payload) as { acknowledged: number }).acknowledged).toBe(0);
	});

	it('does not acknowledge another user’s incidents', async () => {
		await seedIncident(TEST_USER_2_ID, null);

		const ack = await acknowledgeRequest(accessToken);

		expect((JSON.parse(ack.payload) as { acknowledged: number }).acknowledged).toBe(0);
		expect(parseList((await listRequest(accessToken2)).payload).incidents).toHaveLength(1);
	});

	it('hides resolved incidents', async () => {
		await seedIncident(TEST_USER_ID, null, { resolvedAt: new Date() });

		expect(parseList((await listRequest(accessToken)).payload).incidents).toHaveLength(0);
	});
});

// Live tests against the real Web Risk API (Google's test URLs). Gated on
// GOOGLE_WEB_RISK_API_KEY (skipped without it); per-test reset avoids banning the shared user.
import { container } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { getTestContext, resetTestState, TEST_USER_ID } from '@/tests/shared/test-context';
import { UserBanService } from '@/core/auth';
import db from '@/core/db';
import { env } from '@/core/config/env';
import userSafetyStanding from '../../domain/entities/user-safety-standing.entity';
import urlSafetyIncident from '../../domain/entities/url-safety-incident.entity';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, reserveShortUrl } from './utils';

// Google's official Safe Browsing / Web Risk test URLs.
const PHISHING_TEST_URL = 'https://testsafebrowsing.appspot.com/s/phishing.html';
const MALWARE_TEST_URL = 'https://testsafebrowsing.appspot.com/s/malware.html';

const describeLive = env.GOOGLE_WEB_RISK_API_KEY ? describe : describe.skip;

describeLive('destinationUrl safety — live Web Risk', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		// clear any persisted ban for the shared user so leftover state can't fail the suite
		await container.resolve(UserBanService).unban(TEST_USER_ID);
	});

	/**
	 * Reset the offence ladder before every case.
	 *
	 * This matters more than it used to: the ladder is now persisted in `user_safety_standing` (a
	 * Redis flush no longer clears it) and it bans on the *second* offence, so without this the
	 * second test here would suspend the shared Clerk test user and poison every later suite.
	 */
	beforeEach(async () => {
		await db.delete(urlSafetyIncident).where(eq(urlSafetyIncident.userId, TEST_USER_ID)).execute();
		await db
			.delete(userSafetyStanding)
			.where(eq(userSafetyStanding.userId, TEST_USER_ID))
			.execute();
		await container.resolve(UserBanService).unban(TEST_USER_ID);
	});

	const createShortUrl = (destinationUrl: string) =>
		testServer.inject({
			method: 'POST',
			url: SHORT_URL_API_PATH,
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
			payload: { destinationUrl, isActive: true, customDomainId: null },
		});

	it('blocks creating a short URL with a known phishing destination', async () => {
		const response = await createShortUrl(PHISHING_TEST_URL);
		expect(response).toHaveStatusCode(400);
		const body = JSON.parse(response.payload) as { errorCode?: string };
		expect(body.errorCode).toBe('MALICIOUS_DESTINATION_URL');
	});

	it('blocks creating a short URL with a known malware destination', async () => {
		const response = await createShortUrl(MALWARE_TEST_URL);
		expect(response).toHaveStatusCode(400);
		const body = JSON.parse(response.payload) as { errorCode?: string };
		expect(body.errorCode).toBe('MALICIOUS_DESTINATION_URL');
	});

	it('blocks updating a short URL to a known phishing destination', async () => {
		// Reserve a fresh (empty) short URL, then point it at the phishing URL.
		const reserved = JSON.parse(
			(await reserveShortUrl(testServer, accessToken)).payload,
		) as TShortUrlResponseDto;

		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${reserved.shortCode}`,
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
			payload: { destinationUrl: PHISHING_TEST_URL },
		});
		expect(response).toHaveStatusCode(400);
		const body = JSON.parse(response.payload) as { errorCode?: string };
		expect(body.errorCode).toBe('MALICIOUS_DESTINATION_URL');
	});

	it('still allows a safe destination (no false positive)', async () => {
		const response = await createShortUrl('https://example.com');
		expect(response).toHaveStatusCode(201);
	});
});

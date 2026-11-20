import { container } from 'tsyringe';
import type { FastifyInstance } from 'fastify';
import { env } from '@/core/config/env';
import { KeyCache } from '@/core/cache';
import { getTestContext, resetTestState, TEST_USER_ID } from '@/tests/shared/test-context';
import { mockFetchUmamiAllEndpoints, resetFetchMocks } from '@/tests/shared/mocks/umami.mock';
import { HOT_SHORT_CODES_KEY } from '@/modules/url-shortener/config/constants';
import { SHORT_URL_API_PATH, createShortUrl } from '@/modules/url-shortener/http/__tests__/utils';
import AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';

const SCAN = {
	url: 'https://example.com/u/abc12',
	userAgent: 'Mozilla/5.0 Test',
	hostname: 'example.com',
	language: 'en-US',
	referrer: '',
	ip: '203.0.113.42',
	deviceType: 'mobile',
	browserName: 'Chrome',
};

// Seeded high so the hot set's trim to its top entries can never drop the test code
const HOT_SEED_SCORE = 1_000_000;

/**
 * Where a scan ends up. Nothing else fails when forwarding to Umami or to the owner's
 * GA4/Matomo integrations silently stops, so this pins every destination of one scan.
 */
describe('scan forwarding (POST /short-url/:shortCode/record-scan)', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	beforeEach(() => {
		mockFetchUmamiAllEndpoints();
	});

	afterEach(() => {
		resetFetchMocks();
		jest.restoreAllMocks();
	});

	const keyCache = () => container.resolve(KeyCache);

	const recordScan = (shortCode: string) =>
		testServer.inject({
			method: 'POST',
			url: `${SHORT_URL_API_PATH}/${shortCode}/record-scan`,
			headers: {
				'Content-Type': 'application/json',
				'x-internal-api-key': env.INTERNAL_API_SECRET,
			},
			payload: SCAN,
		});

	const umamiSends = () =>
		(global.fetch as jest.Mock).mock.calls.filter(([input]) =>
			String(input).includes('/api/send'),
		) as [string, RequestInit][];

	const seedHotSet = (shortCode: string) =>
		keyCache().getClient().zadd(HOT_SHORT_CODES_KEY, HOT_SEED_SCORE, shortCode);

	const hotScore = async (shortCode: string) =>
		Number(await keyCache().getClient().zscore(HOT_SHORT_CODES_KEY, shortCode));

	const expectOneUmamiSend = () => {
		const sends = umamiSends();
		expect(sends).toHaveLength(1);
		const [, init] = sends[0];
		expect((init.headers as Record<string, string>)['X-Client-Real-IP']).toBe(SCAN.ip);
		const { payload } = JSON.parse(init.body as string) as { payload: Record<string, unknown> };
		expect(payload).toMatchObject({
			url: SCAN.url,
			hostname: SCAN.hostname,
			language: SCAN.language,
			userAgent: SCAN.userAgent,
			device: SCAN.deviceType,
			ip: SCAN.ip,
		});
	};

	it('counts a scan of an owned short URL everywhere', async () => {
		const { shortCode } = await createShortUrl(testServer, accessToken);
		await keyCache().set(`views:${shortCode}`, 7);
		await seedHotSet(shortCode);
		const findEnabled = jest.spyOn(
			container.resolve(AnalyticsIntegrationRepository),
			'findEnabledByUserId',
		);

		const response = await recordScan(shortCode);
		expect(response).toHaveStatusCode(200);

		expectOneUmamiSend();
		expect(await keyCache().get(`views:${shortCode}`)).toBeNull();
		expect(findEnabled).toHaveBeenCalledTimes(1);
		expect(findEnabled).toHaveBeenCalledWith(TEST_USER_ID);
		expect(await hotScore(shortCode)).toBe(HOT_SEED_SCORE + 1);
	});

	it('still sends a scan of an unknown short code to Umami, without integrations', async () => {
		const shortCode = 'zZ9q1';
		await keyCache().set(`views:${shortCode}`, 7);
		await seedHotSet(shortCode);
		const findEnabled = jest.spyOn(
			container.resolve(AnalyticsIntegrationRepository),
			'findEnabledByUserId',
		);

		const response = await recordScan(shortCode);
		expect(response).toHaveStatusCode(200);

		expectOneUmamiSend();
		expect(await keyCache().get(`views:${shortCode}`)).toBeNull();
		expect(findEnabled).not.toHaveBeenCalled();
		expect(await hotScore(shortCode)).toBe(HOT_SEED_SCORE + 1);
	});
});

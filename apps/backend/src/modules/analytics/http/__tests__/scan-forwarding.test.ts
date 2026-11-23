import { container } from 'tsyringe';
import type { FastifyInstance } from 'fastify';
import { env } from '@/core/config/env';
import { KeyCache } from '@/core/cache';
import {
	getTestContext,
	resetTestState,
	TEST_USER_ID,
	TEST_USER_PRO_ID,
} from '@/tests/shared/test-context';
import { ensureProSubscription } from '@/tests/shared/helpers';
import { mockFetchUmamiAllEndpoints, resetFetchMocks } from '@/tests/shared/mocks/umami.mock';
import { HOT_SHORT_CODES_KEY } from '@/modules/url-shortener/config/constants';
import { SHORT_URL_API_PATH, createShortUrl } from '@/modules/url-shortener/http/__tests__/utils';
import AnalyticsIntegrationRepository from '../../domain/repository/analytics-integration.repository';
import { ForwardScanUseCase } from '../../useCase/forward-scan.use-case';
import { ScanIpExclusionMatcherService } from '../../service/scan-ip-exclusion-matcher.service';
import {
	cleanupScanIpExclusions,
	createScanIpExclusion,
	deleteScanIpExclusion,
	insertScanIpExclusion,
} from './scan-ip-exclusion-utils';

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Scans of owned short URLs are forwarded after the exclusion check, so after the response */
const waitFor = async (what: string, condition: () => boolean | Promise<boolean>) => {
	for (let attempt = 0; attempt < 100; attempt++) {
		if (await condition()) return;
		await sleep(20);
	}
	throw new Error(`Timed out waiting for ${what}`);
};

/**
 * Where a scan ends up. Nothing else fails when forwarding to Umami or to the owner's
 * GA4/Matomo integrations silently stops, so this pins every destination of one scan.
 */
describe('scan forwarding (POST /short-url/:shortCode/record-scan)', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessTokenPro: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessTokenPro = ctx.accessTokenPro;
	});

	beforeEach(() => {
		mockFetchUmamiAllEndpoints();
	});

	afterEach(() => {
		resetFetchMocks();
		jest.restoreAllMocks();
	});

	const keyCache = () => container.resolve(KeyCache);

	const recordScan = (shortCode: string, ip = SCAN.ip) =>
		testServer.inject({
			method: 'POST',
			url: `${SHORT_URL_API_PATH}/${shortCode}/record-scan`,
			headers: {
				'Content-Type': 'application/json',
				'x-internal-api-key': env.INTERNAL_API_SECRET,
			},
			payload: { ...SCAN, ip },
		});

	const umamiSends = () =>
		(global.fetch as jest.Mock).mock.calls.filter(([input]) =>
			String(input).includes('/api/send'),
		) as [string, RequestInit][];

	const seedHotSet = (shortCode: string) =>
		keyCache().getClient().zadd(HOT_SHORT_CODES_KEY, HOT_SEED_SCORE, shortCode);

	const hotScore = async (shortCode: string) =>
		Number(await keyCache().getClient().zscore(HOT_SHORT_CODES_KEY, shortCode));

	const spyOnFindEnabled = () =>
		jest.spyOn(container.resolve(AnalyticsIntegrationRepository), 'findEnabledByUserId');

	const expectOneUmamiSend = (ip = SCAN.ip) => {
		const sends = umamiSends();
		expect(sends).toHaveLength(1);
		const [, init] = sends[0];
		expect((init.headers as Record<string, string>)['X-Client-Real-IP']).toBe(ip);
		const { payload } = JSON.parse(init.body as string) as { payload: Record<string, unknown> };
		expect(payload).toMatchObject({
			url: SCAN.url,
			hostname: SCAN.hostname,
			language: SCAN.language,
			userAgent: SCAN.userAgent,
			device: SCAN.deviceType,
			ip,
		});
	};

	it('counts a scan of an owned short URL everywhere', async () => {
		const { shortCode } = await createShortUrl(testServer, accessToken);
		await keyCache().set(`views:${shortCode}`, 7);
		await seedHotSet(shortCode);
		const findEnabled = spyOnFindEnabled();

		const response = await recordScan(shortCode);
		expect(response).toHaveStatusCode(200);

		await waitFor('the Umami send', () => umamiSends().length > 0);
		await waitFor('the integration dispatch', () => findEnabled.mock.calls.length > 0);
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
		const findEnabled = spyOnFindEnabled();

		const response = await recordScan(shortCode);
		expect(response).toHaveStatusCode(200);

		await waitFor('the Umami send', () => umamiSends().length > 0);
		expectOneUmamiSend();
		expect(await keyCache().get(`views:${shortCode}`)).toBeNull();
		expect(findEnabled).not.toHaveBeenCalled();
		expect(await hotScore(shortCode)).toBe(HOT_SEED_SCORE + 1);
	});

	describe('from an excluded IP range', () => {
		const EXCLUDED_IP = '198.51.100.42';
		const OTHER_IP = '192.0.2.7';

		let forward: jest.SpyInstance;
		let findEnabled: jest.SpyInstance;

		beforeAll(async () => {
			await ensureProSubscription();
		});

		beforeEach(async () => {
			await cleanupScanIpExclusions(TEST_USER_PRO_ID, TEST_USER_ID);
			forward = jest.spyOn(ForwardScanUseCase.prototype, 'execute');
			findEnabled = spyOnFindEnabled();
		});

		afterAll(async () => {
			await cleanupScanIpExclusions(TEST_USER_PRO_ID, TEST_USER_ID);
		});

		/** Records one scan and waits until it was forwarded or dropped */
		const scanFrom = async (shortCode: string, ip: string) => {
			(global.fetch as jest.Mock).mockClear();
			forward.mockClear();
			findEnabled.mockClear();
			await keyCache().set(`views:${shortCode}`, 7);
			const hotBefore = await hotScore(shortCode);

			const response = await recordScan(shortCode, ip);
			expect(response).toHaveStatusCode(200);

			expect(forward).toHaveBeenCalledTimes(1);
			await forward.mock.results[0].value;
			// The traffic signal for the safety re-check is no analytics and counts every scan
			expect(await hotScore(shortCode)).toBe(hotBefore + 1);
		};

		const expectCounted = async (shortCode: string, ownerId: string, ip: string) => {
			await waitFor('the Umami send', () => umamiSends().length > 0);
			await waitFor('the integration dispatch', () => findEnabled.mock.calls.length > 0);
			expectOneUmamiSend(ip);
			expect(findEnabled).toHaveBeenCalledTimes(1);
			expect(findEnabled).toHaveBeenCalledWith(ownerId);
			expect(await keyCache().get(`views:${shortCode}`)).toBeNull();
		};

		const expectNotCounted = async (shortCode: string) => {
			expect(umamiSends()).toHaveLength(0);
			expect(findEnabled).not.toHaveBeenCalled();
			expect(await keyCache().get(`views:${shortCode}`)).toBe('7');
		};

		it('drops scans of a Pro owner from an excluded range until the entry is deleted', async () => {
			const { shortCode } = await createShortUrl(testServer, accessTokenPro);
			await seedHotSet(shortCode);

			// Caches the owner's empty list, which adding an entry has to drop
			await scanFrom(shortCode, EXCLUDED_IP);
			await expectCounted(shortCode, TEST_USER_PRO_ID, EXCLUDED_IP);

			const created = await createScanIpExclusion(
				testServer,
				{ ipRange: '198.51.100.0/24' },
				accessTokenPro,
			);
			expect(created).toHaveStatusCode(201);

			await scanFrom(shortCode, EXCLUDED_IP);
			await expectNotCounted(shortCode);

			await scanFrom(shortCode, `::ffff:${EXCLUDED_IP}`);
			await expectNotCounted(shortCode);

			await scanFrom(shortCode, OTHER_IP);
			await expectCounted(shortCode, TEST_USER_PRO_ID, OTHER_IP);

			const { id } = JSON.parse(created.payload) as { id: string };
			expect(await deleteScanIpExclusion(testServer, id, accessTokenPro)).toHaveStatusCode(200);

			await scanFrom(shortCode, EXCLUDED_IP);
			await expectCounted(shortCode, TEST_USER_PRO_ID, EXCLUDED_IP);
		});

		it('counts scans of a free owner from a stored range', async () => {
			const { shortCode } = await createShortUrl(testServer, accessToken);
			await seedHotSet(shortCode);
			await insertScanIpExclusion(TEST_USER_ID, '198.51.100.0/24');
			// Written past the API, so an earlier scan's cached empty list has to go by hand
			await container.resolve(ScanIpExclusionMatcherService).invalidate(TEST_USER_ID);

			await scanFrom(shortCode, EXCLUDED_IP);
			await expectCounted(shortCode, TEST_USER_ID, EXCLUDED_IP);
		});
	});
});

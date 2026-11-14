import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto, TAnalyticsResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, reserveShortUrl } from './utils';
import { mockFetchUmamiAllEndpoints, resetFetchMocks } from '@/tests/shared/mocks/umami.mock';
import { ensureProSubscription } from '@/tests/shared/helpers';

describe('getShortUrlAnalytics', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let accessTokenPro: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		accessTokenPro = ctx.accessTokenPro;
		await ensureProSubscription();
	});

	beforeEach(() => {
		mockFetchUmamiAllEndpoints();
	});

	afterEach(() => {
		resetFetchMocks();
	});

	const getAnalyticsRequest = async (shortCode: string, token: string) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${shortCode}/analytics`,
			headers: { Authorization: `Bearer ${token}` },
		});

	it('should return the summary but lock the details for a free user', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getAnalyticsRequest(shortUrl.shortCode, accessToken);
		expect(response).toHaveStatusCode(200);

		const analytics = JSON.parse(response.payload) as TAnalyticsResponseDto;
		expect(analytics.shortUrlStats.pageviews).toBe(100);
		expect(analytics.summary).toEqual({
			pageviewsLast7Days: expect.any(Number),
			visitorsLast7Days: expect.any(Number),
			topCountry: { label: 'Chrome', share: 63 },
			topDevice: { label: 'Chrome', share: 63 },
		});
		expect(analytics.detailsLocked).toBe(true);
		expect(analytics.viewsAndSessions).toBeNull();
		expect(analytics.browserMetrics).toBeNull();
		expect(analytics.osMetrics).toBeNull();
		expect(analytics.deviceMetrics).toBeNull();
		expect(analytics.countryMetrics).toBeNull();
	});

	it('should return the summary and the details for a pro user', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessTokenPro);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getAnalyticsRequest(shortUrl.shortCode, accessTokenPro);
		expect(response).toHaveStatusCode(200);

		const analytics = JSON.parse(response.payload) as TAnalyticsResponseDto;
		expect(analytics.summary).toBeDefined();
		expect(analytics.detailsLocked).toBe(false);
		expect(analytics.viewsAndSessions?.pageviews).toHaveLength(2);
		expect(analytics.browserMetrics).toHaveLength(2);
		expect(analytics.osMetrics).toHaveLength(2);
		expect(analytics.deviceMetrics).toHaveLength(2);
		expect(analytics.countryMetrics).toHaveLength(2);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/XXXXX/analytics`,
		});
		expect(response).toHaveStatusCode(401);
	});

	it("should return 403 when requesting analytics for another user's short URL", async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getAnalyticsRequest(shortUrl.shortCode, accessToken2);
		expect(response).toHaveStatusCode(403);
	});

	it('should return 404 when shortCode does not exist', async () => {
		const response = await getAnalyticsRequest('XXXXX', accessToken);
		expect(response).toHaveStatusCode(404);
	});
});

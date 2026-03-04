import { getTestContext } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto, TAnalyticsResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, reserveShortUrl } from './utils';

describe('getShortUrlAnalytics', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	const getAnalyticsRequest = async (shortCode: string, token: string) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${shortCode}/analytics`,
			headers: { Authorization: `Bearer ${token}` },
		});

	it('should return analytics data for short URL owner and return 200', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getAnalyticsRequest(shortUrl.shortCode, accessToken);
		expect(response.statusCode).toBe(200);

		const analytics = JSON.parse(response.payload) as TAnalyticsResponseDto;
		expect(analytics).toBeDefined();
		expect(analytics.shortUrlStats).toBeDefined();
	});

	it('should return analytics with correct structure', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getAnalyticsRequest(shortUrl.shortCode, accessToken);
		expect(response.statusCode).toBe(200);

		const analytics = JSON.parse(response.payload) as TAnalyticsResponseDto;
		expect(analytics.shortUrlStats).toBeDefined();
		expect(analytics.viewsAndSessions).toBeDefined();
		expect(analytics.browserMetrics).toBeDefined();
		expect(analytics.osMetrics).toBeDefined();
		expect(analytics.deviceMetrics).toBeDefined();
		expect(analytics.countryMetrics).toBeDefined();
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/XXXXX/analytics`,
		});
		expect(response.statusCode).toBe(401);
	});

	it("should return 403 when requesting analytics for another user's short URL", async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getAnalyticsRequest(shortUrl.shortCode, accessToken2);
		expect(response.statusCode).toBe(403);
	});

	it('should return 404 when shortCode does not exist', async () => {
		const response = await getAnalyticsRequest('XXXXX', accessToken);
		expect(response.statusCode).toBe(404);
	});
});

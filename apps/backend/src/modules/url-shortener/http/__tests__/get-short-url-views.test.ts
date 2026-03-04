import { getTestContext } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, reserveShortUrl } from './utils';

describe('getShortUrlViews', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	const getViewsRequest = async (shortCode: string, token: string) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${shortCode}/get-views`,
			headers: { Authorization: `Bearer ${token}` },
		});

	it('should return total views count for owner', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getViewsRequest(shortUrl.shortCode, accessToken);
		expect(response.statusCode).toBe(200);

		const { views } = JSON.parse(response.payload) as { views: number };
		expect(typeof views).toBe('number');
		expect(views).toBeGreaterThanOrEqual(0);
	});

	it('should return numeric views value', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getViewsRequest(shortUrl.shortCode, accessToken);
		expect(response.statusCode).toBe(200);

		const { views } = JSON.parse(response.payload) as { views: number };
		expect(Number.isInteger(views)).toBe(true);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/XXXXX/get-views`,
		});
		expect(response.statusCode).toBe(401);
	});

	it("should return 403 when requesting views for another user's short URL", async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getViewsRequest(shortUrl.shortCode, accessToken2);
		expect(response.statusCode).toBe(403);
	});

	it('should return 404 when shortCode does not exist', async () => {
		const response = await getViewsRequest('XXXXX', accessToken);
		expect(response.statusCode).toBe(404);
	});
});

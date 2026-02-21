import { getTestContext } from '@/tests/shared/test-context';
import {
	assertShortUrlResponse,
	assertReservedShortUrl,
} from '@/tests/shared/assertions/short-url.assertions';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, reserveShortUrl } from './utils';

describe('getShortUrl', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let userId: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		userId = ctx.user.id;
	});

	const getShortUrlRequest = async (shortCode: string) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${shortCode}`,
		});

	it('should return short URL details for valid shortCode and return 200', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getShortUrlRequest(shortUrl.shortCode);
		expect(response.statusCode).toBe(200);

		const receivedShortUrl = JSON.parse(response.payload) as TShortUrlResponseDto;
		assertShortUrlResponse(receivedShortUrl, userId);
		expect(receivedShortUrl.shortCode).toBe(shortUrl.shortCode);
	});

	it('should return short URL with null destinationUrl for reserved URLs', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getShortUrlRequest(shortUrl.shortCode);
		expect(response.statusCode).toBe(200);

		const receivedShortUrl = JSON.parse(response.payload) as TShortUrlResponseDto;
		assertReservedShortUrl(receivedShortUrl);
	});

	it('should return short URL even if isActive is false', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${shortUrl.shortCode}`,
			headers: { Authorization: `Bearer ${accessToken}` },
			payload: { isActive: false },
		});

		const response = await getShortUrlRequest(shortUrl.shortCode);
		expect(response.statusCode).toBe(200);

		const receivedShortUrl = JSON.parse(response.payload) as TShortUrlResponseDto;
		expect(receivedShortUrl.isActive).toBe(false);
	});

	it('should return 404 when shortCode does not exist', async () => {
		const response = await getShortUrlRequest('XXXXX');
		expect(response.statusCode).toBe(404);
	});
});

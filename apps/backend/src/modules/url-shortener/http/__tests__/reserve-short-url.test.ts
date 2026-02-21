import { getTestContext } from '@/tests/shared/test-context';
import {
	assertShortUrlResponse,
	assertReservedShortUrl,
} from '@/tests/shared/assertions/short-url.assertions';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH } from './utils';

describe('reserveShortUrl', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let userId: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		userId = ctx.user.id;
	});

	const reserveShortUrlRequest = async (token: string) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/reserved`,
			headers: { Authorization: `Bearer ${token}` },
		});

	it('should create and return new reserved short URL for user', async () => {
		const response = await reserveShortUrlRequest(accessToken);
		expect(response.statusCode).toBe(200);

		const shortUrl = JSON.parse(response.payload) as TShortUrlResponseDto;
		assertShortUrlResponse(shortUrl, userId);
		assertReservedShortUrl(shortUrl);
		expect(shortUrl.shortCode).toHaveLength(5);
	});

	it('should return existing reserved short URL if user already has one', async () => {
		const firstResponse = await reserveShortUrlRequest(accessToken);
		const firstShortUrl = JSON.parse(firstResponse.payload) as TShortUrlResponseDto;

		const secondResponse = await reserveShortUrlRequest(accessToken);
		const secondShortUrl = JSON.parse(secondResponse.payload) as TShortUrlResponseDto;

		expect(secondShortUrl.id).toBe(firstShortUrl.id);
		expect(secondShortUrl.shortCode).toBe(firstShortUrl.shortCode);
	});

	it('should create separate reserved URLs for different users', async () => {
		const response1 = await reserveShortUrlRequest(accessToken);
		const shortUrl1 = JSON.parse(response1.payload) as TShortUrlResponseDto;

		const response2 = await reserveShortUrlRequest(accessToken2);
		const shortUrl2 = JSON.parse(response2.payload) as TShortUrlResponseDto;

		expect(shortUrl1.id).not.toBe(shortUrl2.id);
		expect(shortUrl1.shortCode).not.toBe(shortUrl2.shortCode);
	});

	it('reserved short URL should have destinationUrl=null, qrCodeId=null, isActive=false', async () => {
		const response = await reserveShortUrlRequest(accessToken);
		const shortUrl = JSON.parse(response.payload) as TShortUrlResponseDto;

		expect(shortUrl.destinationUrl).toBeNull();
		expect(shortUrl.qrCodeId).toBeNull();
		expect(shortUrl.isActive).toBe(false);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/reserved`,
		});
		expect(response.statusCode).toBe(401);
	});

	it('should generate unique shortCode for each reservation', async () => {
		const response1 = await reserveShortUrlRequest(accessToken);
		const shortUrl1 = JSON.parse(response1.payload) as TShortUrlResponseDto;

		const response2 = await reserveShortUrlRequest(accessToken2);
		const shortUrl2 = JSON.parse(response2.payload) as TShortUrlResponseDto;

		expect(shortUrl1.shortCode).not.toBe(shortUrl2.shortCode);
	});
});

import { getTestContext } from '@/tests/shared/test-context';
import { generateUpdateShortUrlDto } from '@/tests/shared/factories/short-url.factory';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, reserveShortUrl } from './utils';

describe('updateShortUrl', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	const updateShortUrlRequest = async (shortCode: string, payload: object, token: string) =>
		testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${shortCode}`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			payload,
		});

	it('should update destinationUrl successfully and return 200', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const updateDto = generateUpdateShortUrlDto();
		const response = await updateShortUrlRequest(shortUrl.shortCode, updateDto, accessToken);
		expect(response.statusCode).toBe(200);

		const updated = JSON.parse(response.payload) as TShortUrlResponseDto;
		expect(updated.destinationUrl).toBe(updateDto.destinationUrl);
	});

	it('should update isActive state successfully', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await updateShortUrlRequest(
			shortUrl.shortCode,
			{ isActive: true },
			accessToken,
		);
		expect(response.statusCode).toBe(200);

		const updated = JSON.parse(response.payload) as TShortUrlResponseDto;
		expect(updated.isActive).toBe(true);
	});

	it('should update both destinationUrl and isActive together', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const updateDto = generateUpdateShortUrlDto({ isActive: true });
		const response = await updateShortUrlRequest(shortUrl.shortCode, updateDto, accessToken);
		expect(response.statusCode).toBe(200);

		const updated = JSON.parse(response.payload) as TShortUrlResponseDto;
		expect(updated.destinationUrl).toBe(updateDto.destinationUrl);
		expect(updated.isActive).toBe(true);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/XXXXX`,
			payload: { isActive: true },
		});
		expect(response.statusCode).toBe(401);
	});

	it("should return 403 when user tries to update another user's short URL", async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await updateShortUrlRequest(
			shortUrl.shortCode,
			{ isActive: true },
			accessToken2,
		);
		expect(response.statusCode).toBe(403);
	});

	it('should return 404 when shortCode does not exist', async () => {
		const response = await updateShortUrlRequest('XXXXX', { isActive: true }, accessToken);
		expect(response.statusCode).toBe(404);
	});

	it('should return 400 for invalid destinationUrl format', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await updateShortUrlRequest(
			shortUrl.shortCode,
			{ destinationUrl: 'not-a-valid-url' },
			accessToken,
		);
		expect(response.statusCode).toBe(400);
	});

	it('should return 400 when destinationUrl creates redirect loop (points to itself)', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const selfReferencingUrl = `http://localhost:3000/u/${shortUrl.shortCode}`;

		const response = await updateShortUrlRequest(
			shortUrl.shortCode,
			{ destinationUrl: selfReferencingUrl },
			accessToken,
		);

		expect(response.statusCode).toBe(400);
		const error = JSON.parse(response.payload);
		expect(error.message).toContain('destination URL is not allowed');
	});

	it('should allow update when destinationUrl is different from own short URL', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await updateShortUrlRequest(
			shortUrl.shortCode,
			{ destinationUrl: 'https://completely-different-site.com' },
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updated = JSON.parse(response.payload) as TShortUrlResponseDto;
		expect(updated.destinationUrl).toBe('https://completely-different-site.com');
	});
});

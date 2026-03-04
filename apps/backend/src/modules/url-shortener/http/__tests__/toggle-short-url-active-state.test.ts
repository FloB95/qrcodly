import { getTestContext } from '@/tests/shared/test-context';
import { generateUpdateShortUrlDto } from '@/tests/shared/factories/short-url.factory';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, reserveShortUrl } from './utils';

describe('toggleShortUrlActiveState', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	const toggleActiveStateRequest = async (shortCode: string, token: string) =>
		testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${shortCode}/toggle-active-state`,
			headers: { Authorization: `Bearer ${token}` },
		});

	it('should toggle active state from false to true and return 200', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;
		expect(shortUrl.isActive).toBe(false);

		const response = await toggleActiveStateRequest(shortUrl.shortCode, accessToken);
		expect(response.statusCode).toBe(200);

		const toggled = JSON.parse(response.payload) as TShortUrlResponseDto;
		expect(toggled.isActive).toBe(true);
	});

	it('should toggle active state from true to false', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		let shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		// Ensure the URL starts as true (may have been modified by previous tests)
		if (!shortUrl.isActive) {
			const firstToggle = await toggleActiveStateRequest(shortUrl.shortCode, accessToken);
			shortUrl = JSON.parse(firstToggle.payload) as TShortUrlResponseDto;
		}

		// Now toggle from true to false
		const response = await toggleActiveStateRequest(shortUrl.shortCode, accessToken);
		expect(response.statusCode).toBe(200);

		const toggled = JSON.parse(response.payload) as TShortUrlResponseDto;
		expect(toggled.isActive).toBe(false);
	});

	it('should preserve destinationUrl when toggling', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		// Set a destination URL
		const updateDto = generateUpdateShortUrlDto();
		await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${shortUrl.shortCode}`,
			headers: { Authorization: `Bearer ${accessToken}` },
			payload: updateDto,
		});

		// Toggle active state
		const response = await toggleActiveStateRequest(shortUrl.shortCode, accessToken);
		expect(response.statusCode).toBe(200);

		const toggled = JSON.parse(response.payload) as TShortUrlResponseDto;
		expect(toggled.destinationUrl).toBe(updateDto.destinationUrl);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/XXXXX/toggle-active-state`,
		});
		expect(response.statusCode).toBe(401);
	});

	it("should return 403 when toggling another user's short URL", async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await toggleActiveStateRequest(shortUrl.shortCode, accessToken2);
		expect(response.statusCode).toBe(403);
	});

	it('should return 404 when shortCode does not exist', async () => {
		const response = await toggleActiveStateRequest('XXXXX', accessToken);
		expect(response.statusCode).toBe(404);
	});
});

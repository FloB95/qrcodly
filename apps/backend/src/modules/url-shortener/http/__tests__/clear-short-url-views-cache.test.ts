import { env } from '@/core/config/env';
import { getTestContext } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, reserveShortUrl } from './utils';

describe('clearShortUrlViewsCache', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const clearViewsCacheRequest = async (shortCode: string, apiKey?: string) =>
		testServer.inject({
			method: 'POST',
			url: `${SHORT_URL_API_PATH}/${shortCode}/clear-views-cache`,
			headers: apiKey ? { 'x-internal-api-key': apiKey } : {},
		});

	it('should return 200 with valid internal API key', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await clearViewsCacheRequest(shortUrl.shortCode, env.INTERNAL_API_SECRET);
		expect(response.statusCode).toBe(200);

		const body = JSON.parse(response.payload) as { status: string };
		expect(body.status).toBe('ok');
	});

	it('should return 401 without x-internal-api-key header', async () => {
		const response = await clearViewsCacheRequest('XXXXX');
		expect(response.statusCode).toBe(401);
	});

	it('should return 401 with wrong API key', async () => {
		const response = await clearViewsCacheRequest('XXXXX', 'wrong-key');
		expect(response.statusCode).toBe(401);
	});

	it('should return 200 for non-existent shortCode (no-op)', async () => {
		const response = await clearViewsCacheRequest('XXXXX', env.INTERNAL_API_SECRET);
		expect(response.statusCode).toBe(200);

		const body = JSON.parse(response.payload) as { status: string };
		expect(body.status).toBe('ok');
	});
});

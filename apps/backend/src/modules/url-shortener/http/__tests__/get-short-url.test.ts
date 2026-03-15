import { env } from '@/core/config/env';
import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, createShortUrl, reserveShortUrl } from './utils';

type ScanLookupResponse = {
	destinationUrl: string | null;
	isActive: boolean;
	deletedAt: string | null;
};

describe('getShortUrl (internal API - scan lookup)', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const getShortUrlRequest = async (shortCode: string, apiKey?: string) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${shortCode}`,
			headers: apiKey ? { 'x-internal-api-key': apiKey } : {},
		});

	it('should return minimal scan lookup data with valid internal API key', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await getShortUrlRequest(shortUrl.shortCode, env.INTERNAL_API_SECRET);
		expect(response).toHaveStatusCode(200);

		const body = JSON.parse(response.payload) as ScanLookupResponse;
		expect(body.destinationUrl).toBe(shortUrl.destinationUrl);
		expect(body.isActive).toBe(shortUrl.isActive);
		expect(body.deletedAt).toBeNull();
	});

	it('should not expose sensitive fields (createdBy, qrCodeId, customDomain, id)', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await getShortUrlRequest(shortUrl.shortCode, env.INTERNAL_API_SECRET);
		expect(response).toHaveStatusCode(200);

		const body = JSON.parse(response.payload) as Record<string, unknown>;
		expect(body).not.toHaveProperty('createdBy');
		expect(body).not.toHaveProperty('qrCodeId');
		expect(body).not.toHaveProperty('customDomain');
		expect(body).not.toHaveProperty('customDomainId');
		expect(body).not.toHaveProperty('id');
		expect(body).not.toHaveProperty('shortCode');
		expect(body).not.toHaveProperty('name');

		// Only expected fields
		expect(Object.keys(body).sort()).toEqual(['deletedAt', 'destinationUrl', 'isActive']);
	});

	it('should return null destinationUrl for reserved URLs', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await getShortUrlRequest(shortUrl.shortCode, env.INTERNAL_API_SECRET);
		expect(response).toHaveStatusCode(200);

		const body = JSON.parse(response.payload) as ScanLookupResponse;
		expect(body.destinationUrl).toBeNull();
		expect(body.isActive).toBe(false);
	});

	it('should return isActive=false when short URL is deactivated', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${shortUrl.shortCode}`,
			headers: { Authorization: `Bearer ${accessToken}` },
			payload: { isActive: false },
		});

		const response = await getShortUrlRequest(shortUrl.shortCode, env.INTERNAL_API_SECRET);
		expect(response).toHaveStatusCode(200);

		const body = JSON.parse(response.payload) as ScanLookupResponse;
		expect(body.isActive).toBe(false);
	});

	it('should return 404 when shortCode does not exist', async () => {
		const response = await getShortUrlRequest('XXXXX', env.INTERNAL_API_SECRET);
		expect(response).toHaveStatusCode(404);
	});

	it('should return 401 without x-internal-api-key header', async () => {
		const response = await getShortUrlRequest('XXXXX');
		expect(response).toHaveStatusCode(401);
	});

	it('should return 401 with invalid API key', async () => {
		const response = await getShortUrlRequest('XXXXX', 'wrong-key');
		expect(response).toHaveStatusCode(401);
	});

	it('should return 401 when using a Bearer token instead of internal API key', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${shortUrl.shortCode}`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		expect(response).toHaveStatusCode(401);
	});
});

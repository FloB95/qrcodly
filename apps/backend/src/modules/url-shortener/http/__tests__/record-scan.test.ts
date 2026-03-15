import { env } from '@/core/config/env';
import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import { SHORT_URL_API_PATH, createShortUrl } from './utils';
import { mockFetchUmamiAllEndpoints, resetFetchMocks } from '@/tests/shared/mocks/umami.mock';

const SCAN_PAYLOAD = {
	url: 'https://example.com/u/abc12',
	userAgent: 'Mozilla/5.0 Test',
	hostname: 'example.com',
	language: 'en-US',
	referrer: '',
	ip: '203.0.113.42',
	deviceType: 'desktop',
	browserName: 'Chrome',
	screen: 'Windows',
};

describe('recordScan (POST /:shortCode/record-scan)', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	beforeEach(() => {
		mockFetchUmamiAllEndpoints();
	});

	afterEach(() => {
		resetFetchMocks();
	});

	const recordScanRequest = async (
		shortCode: string,
		body: Record<string, unknown>,
		apiKey?: string,
	) =>
		testServer.inject({
			method: 'POST',
			url: `${SHORT_URL_API_PATH}/${shortCode}/record-scan`,
			headers: {
				'Content-Type': 'application/json',
				...(apiKey ? { 'x-internal-api-key': apiKey } : {}),
			},
			payload: body,
		});

	it('should return 200 with valid internal API key and payload', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await recordScanRequest(
			shortUrl.shortCode,
			SCAN_PAYLOAD,
			env.INTERNAL_API_SECRET,
		);
		expect(response).toHaveStatusCode(200);

		const body = JSON.parse(response.payload) as { status: string };
		expect(body.status).toBe('ok');
	});

	it('should return 200 for non-existent shortCode (still processes Umami + cache clear)', async () => {
		const response = await recordScanRequest('XXXXX', SCAN_PAYLOAD, env.INTERNAL_API_SECRET);
		expect(response).toHaveStatusCode(200);

		const body = JSON.parse(response.payload) as { status: string };
		expect(body.status).toBe('ok');
	});

	it('should accept payload without optional screen field', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);
		const { screen: _, ...payloadWithoutScreen } = SCAN_PAYLOAD;

		const response = await recordScanRequest(
			shortUrl.shortCode,
			payloadWithoutScreen,
			env.INTERNAL_API_SECRET,
		);
		expect(response).toHaveStatusCode(200);
	});

	it('should return 401 without x-internal-api-key header', async () => {
		const response = await recordScanRequest('XXXXX', SCAN_PAYLOAD);
		expect(response).toHaveStatusCode(401);
	});

	it('should return 401 with invalid API key', async () => {
		const response = await recordScanRequest('XXXXX', SCAN_PAYLOAD, 'wrong-key');
		expect(response).toHaveStatusCode(401);
	});

	it('should return 401 when using Bearer token instead of internal API key', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await testServer.inject({
			method: 'POST',
			url: `${SHORT_URL_API_PATH}/${shortUrl.shortCode}/record-scan`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: SCAN_PAYLOAD,
		});
		expect(response).toHaveStatusCode(401);
	});

	it('should return 400 when required body fields are missing', async () => {
		const response = await recordScanRequest(
			'XXXXX',
			{ url: 'https://example.com' },
			env.INTERNAL_API_SECRET,
		);
		expect(response).toHaveStatusCode(400);
	});
});

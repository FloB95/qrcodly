import { env } from '@/core/config/env';
import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import { generateDynamicUrlQrCodeDto } from '@/modules/qr-code/http/__tests__/utils';
import { API_BASE_PATH } from '@/core/config/constants';
import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, createShortUrl } from './utils';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

describe('deleteShortUrl', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	const deleteShortUrlRequest = async (shortCode: string, token: string) =>
		testServer.inject({
			method: 'DELETE',
			url: `${SHORT_URL_API_PATH}/${shortCode}`,
			headers: { Authorization: `Bearer ${token}` },
		});

	it('should soft-delete a standalone short URL and return 200', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await deleteShortUrlRequest(shortUrl.shortCode, accessToken);
		expect(response).toHaveStatusCode(200);

		const body = JSON.parse(response.payload);
		expect(body.deleted).toBe(true);
	});

	it('should return 404 when fetching a deleted short URL via internal API', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);
		await deleteShortUrlRequest(shortUrl.shortCode, accessToken);

		const getResponse = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${shortUrl.shortCode}`,
			headers: { 'x-internal-api-key': env.INTERNAL_API_SECRET },
		});
		expect(getResponse.statusCode).toBe(404);
	});

	it('should return 400 when trying to delete a QR-code-linked short URL', async () => {
		// Create a dynamic QR code which generates a linked short URL
		const createResponse = await testServer.inject({
			method: 'POST',
			url: QR_CODE_API_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: generateDynamicUrlQrCodeDto(),
		});
		expect(createResponse.statusCode).toBe(201);
		const qrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;
		expect(qrCode.shortUrl).not.toBeNull();

		const response = await deleteShortUrlRequest(qrCode.shortUrl!.shortCode, accessToken);
		expect(response).toHaveStatusCode(400);

		const error = JSON.parse(response.payload);
		expect(error.message).toContain('linked to a QR code');
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'DELETE',
			url: `${SHORT_URL_API_PATH}/XXXXX`,
		});
		expect(response).toHaveStatusCode(401);
	});

	it("should return 403 when trying to delete another user's short URL", async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await deleteShortUrlRequest(shortUrl.shortCode, accessToken2);
		expect(response).toHaveStatusCode(403);
	});

	it('should return 404 when shortCode does not exist', async () => {
		const response = await deleteShortUrlRequest('XXXXX', accessToken);
		expect(response).toHaveStatusCode(404);
	});

	it('should return 404 when trying to delete an already deleted short URL', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);
		await deleteShortUrlRequest(shortUrl.shortCode, accessToken);

		const response = await deleteShortUrlRequest(shortUrl.shortCode, accessToken);
		expect(response).toHaveStatusCode(404);
	});
});

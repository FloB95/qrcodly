import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { generateEditableUrlQrCodeDto } from '@/modules/qr-code/http/__tests__/utils';
import { SHORT_URL_API_PATH } from './utils';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

describe('softDeletedShortUrl', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let deletedShortCode!: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;

		// Create a dynamic QR code (editable URL) which generates a linked short URL
		const createResponse = await testServer.inject({
			method: 'POST',
			url: QR_CODE_API_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: generateEditableUrlQrCodeDto(),
		});
		expect(createResponse.statusCode).toBe(201);
		const qrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;
		expect(qrCode.shortUrl).not.toBeNull();
		deletedShortCode = qrCode.shortUrl!.shortCode;

		// Delete the QR code — this soft-deletes the linked short URL
		const deleteResponse = await testServer.inject({
			method: 'DELETE',
			url: `${QR_CODE_API_PATH}/${qrCode.id}`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		expect(deleteResponse.statusCode).toBe(200);
	});

	it('should return 404 via public GET for a soft-deleted short URL', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${deletedShortCode}`,
		});
		expect(response.statusCode).toBe(404);
	});

	it('should return 404 when trying to update a soft-deleted short URL', async () => {
		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${deletedShortCode}`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: { destinationUrl: 'https://should-not-work.com' },
		});
		expect(response.statusCode).toBe(404);
	});

	it('should return 404 when trying to toggle active state of a soft-deleted short URL', async () => {
		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${deletedShortCode}/toggle-active-state`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		expect(response.statusCode).toBe(404);
	});

	it('should return 404 when trying to get analytics of a soft-deleted short URL', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${deletedShortCode}/analytics`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		expect(response.statusCode).toBe(404);
	});

	it('should return 404 when trying to get views of a soft-deleted short URL', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${deletedShortCode}/get-views`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		expect(response.statusCode).toBe(404);
	});
});

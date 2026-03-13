import { getTestContext } from '@/tests/shared/test-context';
import { generateUpdateShortUrlDto } from '@/tests/shared/factories/short-url.factory';
import { generateEditableUrlQrCodeDto } from '@/modules/qr-code/http/__tests__/utils';
import { API_BASE_PATH } from '@/core/config/constants';
import type { FastifyInstance } from 'fastify';
import type {
	TQrCodeWithRelationsResponseDto,
	TShortUrlResponseDto,
	TShortUrlWithCustomDomainResponseDto,
} from '@shared/schemas';
import { SHORT_URL_API_PATH, reserveShortUrl } from './utils';
import { env } from '@/core/config/env';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

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

		const selfReferencingUrl = `${env.FRONTEND_URL}/u/${shortUrl.shortCode}`;

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

	it('should return 400 when destinationUrl is set to null', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		// First set a valid destination URL
		await updateShortUrlRequest(
			shortUrl.shortCode,
			{ destinationUrl: 'https://example.com' },
			accessToken,
		);

		// Try to set it to null
		const response = await updateShortUrlRequest(
			shortUrl.shortCode,
			{ destinationUrl: null },
			accessToken,
		);
		expect(response.statusCode).toBe(400);
	});

	it('should return 400 when destinationUrl is set to empty string', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await updateShortUrlRequest(
			shortUrl.shortCode,
			{ destinationUrl: '' },
			accessToken,
		);
		expect(response.statusCode).toBe(400);
	});

	it('should ignore customDomainId when sent in update payload', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await updateShortUrlRequest(
			shortUrl.shortCode,
			{
				destinationUrl: 'https://example.com',
				customDomainId: '00000000-0000-0000-0000-000000000000',
			},
			accessToken,
		);

		// Should succeed but strip customDomainId (Zod strips unknown keys)
		expect(response.statusCode).toBe(200);
		const updated = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(updated.customDomain).toBeNull();
	});

	it('should update name successfully', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		const response = await updateShortUrlRequest(
			shortUrl.shortCode,
			{ name: 'My Updated Link' },
			accessToken,
		);
		expect(response.statusCode).toBe(200);

		const updated = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(updated.name).toBe('My Updated Link');
	});

	it('should set name to null when updating with null', async () => {
		const reserveResponse = await reserveShortUrl(testServer, accessToken);
		const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

		// First set a name
		await updateShortUrlRequest(shortUrl.shortCode, { name: 'Test Name' }, accessToken);

		// Then clear it
		const response = await updateShortUrlRequest(shortUrl.shortCode, { name: null }, accessToken);
		expect(response.statusCode).toBe(200);

		const updated = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(updated.name).toBeNull();
	});

	it('should return 400 when trying to update a QR-code-linked short URL', async () => {
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

		const response = await updateShortUrlRequest(
			qrCode.shortUrl!.shortCode,
			{ destinationUrl: 'https://new-destination.com' },
			accessToken,
		);
		expect(response.statusCode).toBe(400);

		const error = JSON.parse(response.payload);
		expect(error.message).toContain('linked to a QR code');
	});
});

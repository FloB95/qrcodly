import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext } from '@/tests/shared/test-context';
import { generateUpdateShortUrlDto } from '@/tests/shared/factories/short-url.factory';
import {
	assertShortUrlResponse,
	assertReservedShortUrl,
} from '@/tests/shared/assertions/short-url.assertions';
import type { FastifyInstance } from 'fastify';
import type {
	TShortUrlResponseDto,
	TAnalyticsResponseDto,
	TQrCodeWithRelationsResponseDto,
} from '@shared/schemas';
import { generateEditableUrlQrCodeDto } from '@/modules/qr-code/http/__tests__/utils';

const SHORT_URL_API_PATH = `${API_BASE_PATH}/short-url`;

describe('ShortUrlController', () => {
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

	describe('GET /:shortCode', () => {
		const getShortUrlRequest = async (shortCode: string) =>
			testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/${shortCode}`,
			});

		it('should return short URL details for valid shortCode and return 200', async () => {
			// First create a short URL
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			// Fetch it
			const response = await getShortUrlRequest(shortUrl.shortCode);
			expect(response.statusCode).toBe(200);

			const receivedShortUrl = JSON.parse(response.payload) as TShortUrlResponseDto;
			assertShortUrlResponse(receivedShortUrl, userId);
			expect(receivedShortUrl.shortCode).toBe(shortUrl.shortCode);
		});

		it('should return short URL with null destinationUrl for reserved URLs', async () => {
			// Create a reserved URL
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			// Fetch it
			const response = await getShortUrlRequest(shortUrl.shortCode);
			expect(response.statusCode).toBe(200);

			const receivedShortUrl = JSON.parse(response.payload) as TShortUrlResponseDto;
			assertReservedShortUrl(receivedShortUrl);
		});

		it('should return short URL even if isActive is false', async () => {
			// Create and update to inactive
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			await testServer.inject({
				method: 'PATCH',
				url: `${SHORT_URL_API_PATH}/${shortUrl.shortCode}`,
				headers: { Authorization: `Bearer ${accessToken}` },
				payload: { isActive: false },
			});

			// Fetch it
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

	describe('PATCH /:shortCode', () => {
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
			// Create a reserved URL
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			const updateDto = generateUpdateShortUrlDto();
			const response = await updateShortUrlRequest(shortUrl.shortCode, updateDto, accessToken);
			expect(response.statusCode).toBe(200);

			const updated = JSON.parse(response.payload) as TShortUrlResponseDto;
			expect(updated.destinationUrl).toBe(updateDto.destinationUrl);
		});

		it('should update isActive state successfully', async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
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
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
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
			// User 1 creates a short URL
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			// User 2 tries to update it
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
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			const response = await updateShortUrlRequest(
				shortUrl.shortCode,
				{ destinationUrl: 'not-a-valid-url' },
				accessToken,
			);
			expect(response.statusCode).toBe(400);
		});

		it('should return 400 when destinationUrl creates redirect loop (points to itself)', async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			// Construct self-referencing URL (same format as buildShortUrl)
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
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
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

	describe('PATCH /:shortCode/toggle-active-state', () => {
		const toggleActiveStateRequest = async (shortCode: string, token: string) =>
			testServer.inject({
				method: 'PATCH',
				url: `${SHORT_URL_API_PATH}/${shortCode}/toggle-active-state`,
				headers: { Authorization: `Bearer ${token}` },
			});

		it('should toggle active state from false to true and return 200', async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;
			expect(shortUrl.isActive).toBe(false);

			const response = await toggleActiveStateRequest(shortUrl.shortCode, accessToken);
			expect(response.statusCode).toBe(200);

			const toggled = JSON.parse(response.payload) as TShortUrlResponseDto;
			expect(toggled.isActive).toBe(true);
		});

		it('should toggle active state from true to false', async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
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
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
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
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			const response = await toggleActiveStateRequest(shortUrl.shortCode, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 when shortCode does not exist', async () => {
			const response = await toggleActiveStateRequest('XXXXX', accessToken);
			expect(response.statusCode).toBe(404);
		});
	});

	describe('GET /reserved', () => {
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
			// First request creates one
			const firstResponse = await reserveShortUrlRequest(accessToken);
			const firstShortUrl = JSON.parse(firstResponse.payload) as TShortUrlResponseDto;

			// Second request should reuse the same one
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

	describe('GET /:shortCode/analytics', () => {
		const getAnalyticsRequest = async (shortCode: string, token: string) =>
			testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/${shortCode}/analytics`,
				headers: { Authorization: `Bearer ${token}` },
			});

		it('should return analytics data for short URL owner and return 200', async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			const response = await getAnalyticsRequest(shortUrl.shortCode, accessToken);
			expect(response.statusCode).toBe(200);

			const analytics = JSON.parse(response.payload) as TAnalyticsResponseDto;
			expect(analytics).toBeDefined();
			expect(analytics.shortUrlStats).toBeDefined();
		});

		it('should return analytics with correct structure', async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			const response = await getAnalyticsRequest(shortUrl.shortCode, accessToken);
			expect(response.statusCode).toBe(200);

			const analytics = JSON.parse(response.payload) as TAnalyticsResponseDto;
			expect(analytics.shortUrlStats).toBeDefined();
			expect(analytics.viewsAndSessions).toBeDefined();
			expect(analytics.browserMetrics).toBeDefined();
			expect(analytics.osMetrics).toBeDefined();
			expect(analytics.deviceMetrics).toBeDefined();
			expect(analytics.countryMetrics).toBeDefined();
		});

		it('should return 401 when not authenticated', async () => {
			const response = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/XXXXX/analytics`,
			});
			expect(response.statusCode).toBe(401);
		});

		it("should return 403 when requesting analytics for another user's short URL", async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			const response = await getAnalyticsRequest(shortUrl.shortCode, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 when shortCode does not exist', async () => {
			const response = await getAnalyticsRequest('XXXXX', accessToken);
			expect(response.statusCode).toBe(404);
		});
	});

	describe('GET /:shortCode/get-views', () => {
		const getViewsRequest = async (shortCode: string, token: string) =>
			testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/${shortCode}/get-views`,
				headers: { Authorization: `Bearer ${token}` },
			});

		it('should return total views count for owner', async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			const response = await getViewsRequest(shortUrl.shortCode, accessToken);
			expect(response.statusCode).toBe(200);

			const { views } = JSON.parse(response.payload) as { views: number };
			expect(typeof views).toBe('number');
			expect(views).toBeGreaterThanOrEqual(0);
		});

		it('should return numeric views value', async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			const response = await getViewsRequest(shortUrl.shortCode, accessToken);
			expect(response.statusCode).toBe(200);

			const { views } = JSON.parse(response.payload) as { views: number };
			expect(Number.isInteger(views)).toBe(true);
		});

		it('should return 401 when not authenticated', async () => {
			const response = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/XXXXX/get-views`,
			});
			expect(response.statusCode).toBe(401);
		});

		it("should return 403 when requesting views for another user's short URL", async () => {
			const reserveResponse = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}/reserved`,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const shortUrl = JSON.parse(reserveResponse.payload) as TShortUrlResponseDto;

			const response = await getViewsRequest(shortUrl.shortCode, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 when shortCode does not exist', async () => {
			const response = await getViewsRequest('XXXXX', accessToken);
			expect(response.statusCode).toBe(404);
		});
	});

	describe('Soft-deleted short URLs', () => {
		const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;
		let deletedShortCode!: string;

		beforeAll(async () => {
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
});

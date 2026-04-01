import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import { resetTestState } from '@/tests/shared/test-context';
import {
	generateQrCodeDto,
	generateDynamicUrlQrCodeDto,
	getTestContext,
	QR_CODE_API_PATH,
} from './utils';

describe('updateQrCode - URL Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const createQrCode = async (dto: object, token: string) => {
		const response = await testServer.inject({
			method: 'POST',
			url: QR_CODE_API_PATH,
			payload: dto,
			headers: { Authorization: `Bearer ${token}` },
		});
		return JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
	};

	const updateQrCodeRequest = async (id: string, payload: TUpdateQrCodeDto, token: string) =>
		testServer.inject({
			method: 'PATCH',
			url: `${QR_CODE_API_PATH}/${id}`,
			payload,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

	describe('Static URL (isDynamic: false)', () => {
		it('should update non-editable URL content', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);
			const newUrl = 'https://updated-example.com';

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: newUrl,
							isDynamic: false,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.content.type).toBe('url');
			if (updatedQrCode.content.type === 'url') {
				expect(updatedQrCode.content.data.url).toBe(newUrl);
				expect(updatedQrCode.content.data.isDynamic).toBe(false);
			}

			// Verify qrCodeData is updated to the new URL
			expect(updatedQrCode.qrCodeData).toBe(newUrl);
		});

		it('should verify non-dynamic URL QR code has no short URL', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			// Non-editable URL should not have a short URL
			expect(createdQrCode.shortUrl).toBeNull();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: 'https://another-static.com',
							isDynamic: false,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.shortUrl).toBeNull();

			// qrCodeData should be the raw URL
			expect(updatedQrCode.qrCodeData).toBe('https://another-static.com');
		});

		it('should update static URL with name and config', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);
			const newUrl = 'https://full-update.com';
			const newName = 'Fully Updated Static URL';
			const newConfig = { ...createdQrCode.config, width: 500 };

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					name: newName,
					config: newConfig,
					content: {
						type: 'url',
						data: {
							url: newUrl,
							isDynamic: false,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.name).toBe(newName);
			expect(updatedQrCode.config.width).toBe(500);
			expect(updatedQrCode.qrCodeData).toBe(newUrl);
		});
	});

	describe('Dynamic URL (isDynamic: true)', () => {
		it('should update editable URL content and update linked short URL', async () => {
			const createdQrCode = await createQrCode(generateDynamicUrlQrCodeDto(), accessToken);
			const newUrl = 'https://new-destination.com';

			// Verify short URL exists
			expect(createdQrCode.shortUrl).toBeDefined();
			expect(createdQrCode.shortUrl?.destinationUrl).toBeDefined();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: newUrl,
							isDynamic: true,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.content.type).toBe('url');
			if (updatedQrCode.content.type === 'url') {
				// For editable URLs, the actual URL is stored in shortUrl.destinationUrl
				expect(updatedQrCode.shortUrl?.destinationUrl).toBe(newUrl);
				expect(updatedQrCode.content.data.isDynamic).toBe(true);
			}

			// qrCodeData should contain the short URL
			expect(updatedQrCode.qrCodeData).toContain('/u/');
			expect(updatedQrCode.qrCodeData).toContain(updatedQrCode.shortUrl?.shortCode);
		});

		it('should verify dynamic URL QR code maintains short URL after update', async () => {
			const createdQrCode = await createQrCode(generateDynamicUrlQrCodeDto(), accessToken);
			const originalShortCode = createdQrCode.shortUrl?.shortCode;

			expect(originalShortCode).toBeDefined();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: 'https://updated-dynamic.com',
							isDynamic: true,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			// Short code should remain the same
			expect(updatedQrCode.shortUrl?.shortCode).toBe(originalShortCode);
			// Destination URL should be updated
			expect(updatedQrCode.shortUrl?.destinationUrl).toBe('https://updated-dynamic.com');

			// qrCodeData should still use the same short code
			expect(updatedQrCode.qrCodeData).toContain(originalShortCode);
		});

		it('should update content.data.url in QR code record when dynamic URL is updated', async () => {
			const initialUrl = 'https://initial-target.com';
			const createdQrCode = await createQrCode(
				{
					...generateDynamicUrlQrCodeDto(),
					content: { type: 'url', data: { url: initialUrl, isDynamic: true } },
				},
				accessToken,
			);

			// Verify initial state
			expect(createdQrCode.shortUrl).toBeDefined();
			expect(createdQrCode.shortUrl?.destinationUrl).toBe(initialUrl);
			if (createdQrCode.content.type === 'url') {
				expect(createdQrCode.content.data.url).toBe(initialUrl);
			}

			const updatedUrl = 'https://updated-target.com';
			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: { url: updatedUrl, isDynamic: true },
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

			// Both content.data.url AND shortUrl.destinationUrl must reflect the new URL
			expect(updatedQrCode.content.type).toBe('url');
			if (updatedQrCode.content.type === 'url') {
				expect(updatedQrCode.content.data.url).toBe(updatedUrl);
				expect(updatedQrCode.content.data.isDynamic).toBe(true);
			}
			expect(updatedQrCode.shortUrl?.destinationUrl).toBe(updatedUrl);

			// Short code and qrCodeData should remain unchanged
			expect(updatedQrCode.shortUrl?.shortCode).toBe(createdQrCode.shortUrl?.shortCode);
			expect(updatedQrCode.qrCodeData).toContain(createdQrCode.shortUrl?.shortCode);
		});

		it('should keep content.data.url in sync after multiple sequential updates', async () => {
			const createdQrCode = await createQrCode(generateDynamicUrlQrCodeDto(), accessToken);
			const originalShortCode = createdQrCode.shortUrl?.shortCode;

			const urls = [
				'https://first-update.com',
				'https://second-update.com',
				'https://third-update.com',
			];

			let lastQrCode = createdQrCode;
			for (const url of urls) {
				const response = await updateQrCodeRequest(
					lastQrCode.id,
					{
						content: {
							type: 'url',
							data: { url, isDynamic: true },
						},
					},
					accessToken,
				);

				expect(response).toHaveStatusCode(200);
				lastQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

				// After each update, both fields must be in sync
				if (lastQrCode.content.type === 'url') {
					expect(lastQrCode.content.data.url).toBe(url);
				}
				expect(lastQrCode.shortUrl?.destinationUrl).toBe(url);
			}

			// Short code must stay the same through all updates
			expect(lastQrCode.shortUrl?.shortCode).toBe(originalShortCode);
		});

		it('should update editable URL with name and config together', async () => {
			const createdQrCode = await createQrCode(generateDynamicUrlQrCodeDto(), accessToken);
			const newUrl = 'https://comprehensive-update.com';
			const newName = 'Fully Updated QR';
			const newConfig = { ...createdQrCode.config, width: 450 };

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					name: newName,
					config: newConfig,
					content: {
						type: 'url',
						data: {
							url: newUrl,
							isDynamic: true,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.name).toBe(newName);
			expect(updatedQrCode.config.width).toBe(450);
			if (updatedQrCode.content.type === 'url') {
				// For editable URLs, verify short URL destination was updated
				expect(updatedQrCode.shortUrl?.destinationUrl).toBe(newUrl);
				expect(updatedQrCode.content.data.isDynamic).toBe(true);
			}
		});
	});

	describe('Validation', () => {
		it('should reject invalid URL format', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: 'not-a-valid-url',
							isDynamic: false,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject URL with invalid hostname (no TLD)', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: 'https://abcde',
							isDynamic: false,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject empty URL', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: '',
							isDynamic: false,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject dynamic URL update that creates redirect loop (destination = own short URL)', async () => {
			// Create an editable/dynamic URL QR code
			const createdQrCode = await createQrCode(generateDynamicUrlQrCodeDto(), accessToken);

			// Get the short URL that was created
			expect(createdQrCode.shortUrl).toBeDefined();

			// Construct the self-referencing URL (same format as buildShortUrl)
			// The qrCodeData contains the full short URL
			expect(createdQrCode.qrCodeData).toBeDefined();
			const selfReferencingUrl = createdQrCode.qrCodeData!;

			// Try to update the QR code with the destination pointing to its own short URL
			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: selfReferencingUrl,
							isDynamic: true,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
			const error = JSON.parse(response.payload);
			expect(error.message).toContain('destination URL is not allowed');
		});

		it('should allow dynamic URL update when destination is different from own short URL', async () => {
			const createdQrCode = await createQrCode(generateDynamicUrlQrCodeDto(), accessToken);

			// Update with a completely different URL
			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: 'https://completely-different-domain.com/page',
							isDynamic: true,
						},
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.shortUrl?.destinationUrl).toBe(
				'https://completely-different-domain.com/page',
			);
		});
	});
});

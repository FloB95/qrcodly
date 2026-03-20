import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import {
	generateUrlCsv,
	generateWifiCsv,
	generateInvalidCsv,
	generateTextCsv,
} from '@/tests/shared/factories/csv.factory';
import type { FastifyInstance } from 'fastify';
import type { TQrCodeOptions, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { QrCodeDefaults } from '@shared/schemas';
import FormData from 'form-data';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

// Minimal valid 1x1 PNG as base64 data URL
const TEST_BASE64_IMAGE =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('bulkImportQrCodes', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	const bulkImportRequest = async (
		contentType: string,
		csvContent: string,
		token: string,
		config: TQrCodeOptions = QrCodeDefaults,
	) => {
		const formData = new FormData();
		formData.append('file', Buffer.from(csvContent), {
			filename: 'test.csv',
			contentType: 'text/csv',
		});
		formData.append('contentType', contentType);
		formData.append('config', JSON.stringify(config));

		return testServer.inject({
			method: 'POST',
			url: `${QR_CODE_API_PATH}/bulk-import`,
			payload: formData,
			headers: {
				Authorization: `Bearer ${token}`,
				...formData.getHeaders(),
			},
		});
	};

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	describe('POST /qr-code/bulk-import', () => {
		it('should import multiple URL QR codes from CSV successfully', async () => {
			const csvContent = generateUrlCsv(3);
			const response = await bulkImportRequest('url', csvContent, accessToken);

			expect(response).toHaveStatusCode(201);
			const qrCodes = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto[];
			expect(Array.isArray(qrCodes)).toBe(true);
			expect(qrCodes.length).toBe(3);
		});

		it('should create QR codes with correct data from CSV rows', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example.com;Test QR;0';
			const response = await bulkImportRequest('url', csvContent, accessToken);

			expect(response).toHaveStatusCode(201);
			const qrCodes = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto[];
			expect(qrCodes[0].name).toBe('Test QR');
			if (qrCodes[0].content.type === 'url') {
				expect(qrCodes[0].content.data.url).toBe('https://example.com');
				expect(qrCodes[0].content.data.isDynamic).toBe(false);
			}
		});

		it('should return array of created QR codes', async () => {
			const csvContent = generateUrlCsv(2);
			const response = await bulkImportRequest('url', csvContent, accessToken);

			expect(response).toHaveStatusCode(201);
			const qrCodes = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto[];
			expect(Array.isArray(qrCodes)).toBe(true);
			qrCodes.forEach((qrCode) => {
				expect(qrCode.id).toBeDefined();
				expect(qrCode.name).toBeDefined();
				expect(qrCode.content).toBeDefined();
			});
		});

		it('should import text QR codes from CSV', async () => {
			const csvContent = generateTextCsv(2);
			const response = await bulkImportRequest('text', csvContent, accessToken);

			expect(response).toHaveStatusCode(201);
			const qrCodes = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto[];
			expect(qrCodes.length).toBe(2);
			qrCodes.forEach((qrCode) => {
				expect(qrCode.content.type).toBe('text');
			});
		});

		it('should import wifi QR codes from CSV', async () => {
			const csvContent = generateWifiCsv(2);
			const response = await bulkImportRequest('wifi', csvContent, accessToken);

			expect(response).toHaveStatusCode(201);
			const qrCodes = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto[];
			expect(qrCodes.length).toBe(2);
			qrCodes.forEach((qrCode) => {
				expect(qrCode.content.type).toBe('wifi');
			});
		});

		it('should return 400 with line number for invalid CSV row', async () => {
			const csvContent = generateInvalidCsv();
			const response = await bulkImportRequest('url', csvContent, accessToken);

			expect(response).toHaveStatusCode(400);
			const error = JSON.parse(response.payload) as { message: string };
			expect(error.message).toContain('line');
		});

		it('should return 400 when content type not supported for bulk import', async () => {
			const csvContent = generateUrlCsv(1);
			const response = await bulkImportRequest('event', csvContent, accessToken);

			expect(response).toHaveStatusCode(400);
			const error = JSON.parse(response.payload) as { message: string };
			expect(error.message).toContain('not supported');
		});

		it('should validate required fields per content type (e.g., ssid for wifi)', async () => {
			const invalidWifiCsv = 'ssid;password;encryption;name\n;somepassword;WPA;Test';
			const response = await bulkImportRequest('wifi', invalidWifiCsv, accessToken);

			expect(response).toHaveStatusCode(400);
		});

		it('should return 401 when not authenticated', async () => {
			const csvContent = generateUrlCsv(1);
			const formData = new FormData();
			formData.append('file', Buffer.from(csvContent), {
				filename: 'test.csv',
				contentType: 'text/csv',
			});
			formData.append('contentType', 'url');
			formData.append('config', JSON.stringify(QrCodeDefaults));

			const response = await testServer.inject({
				method: 'POST',
				url: `${QR_CODE_API_PATH}/bulk-import`,
				payload: formData,
				headers: {
					...formData.getHeaders(),
				},
			});

			expect(response).toHaveStatusCode(401);
		});

		it('should skip empty lines in CSV', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example.com;Test;0\n\n\nhttps://example2.com;Test2;0';
			const response = await bulkImportRequest('url', csvContent, accessToken);

			expect(response).toHaveStatusCode(201);
			const qrCodes = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto[];
			expect(qrCodes.length).toBe(2);
		});

		it('should return 400 when config is not provided', async () => {
			const csvContent = generateUrlCsv(1);
			const formData = new FormData();
			formData.append('file', Buffer.from(csvContent), {
				filename: 'test.csv',
				contentType: 'text/csv',
			});
			formData.append('contentType', 'url');

			const response = await testServer.inject({
				method: 'POST',
				url: `${QR_CODE_API_PATH}/bulk-import`,
				payload: formData,
				headers: {
					Authorization: `Bearer ${accessToken}`,
					...formData.getHeaders(),
				},
			});

			expect(response).toHaveStatusCode(400);
		});

		it('should handle malformed CSV gracefully', async () => {
			const malformedCsv = 'url;name\nno_semicolons_here';
			const response = await bulkImportRequest('url', malformedCsv, accessToken);

			expect(response).toHaveStatusCode(400);
		});

		it('should bulk import multiple QR codes with an image in config', async () => {
			const configWithImage: TQrCodeOptions = {
				...QrCodeDefaults,
				image: TEST_BASE64_IMAGE,
			};
			const csvContent = generateUrlCsv(3);
			const response = await bulkImportRequest('url', csvContent, accessToken, configWithImage);

			expect(response).toHaveStatusCode(201);
			const qrCodes = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto[];
			expect(qrCodes.length).toBe(3);

			// Each QR code must have its own unique image path (not shared)
			const imagePaths = qrCodes.map((qr) => qr.config.image).filter(Boolean);
			expect(imagePaths.length).toBe(3);

			const uniquePaths = new Set(imagePaths);
			expect(uniquePaths.size).toBe(3);
		});

		it('should upload independent images for each QR code during bulk import', async () => {
			const configWithImage: TQrCodeOptions = {
				...QrCodeDefaults,
				image: TEST_BASE64_IMAGE,
			};
			const csvContent = generateUrlCsv(2);
			const response = await bulkImportRequest('url', csvContent, accessToken, configWithImage);

			expect(response).toHaveStatusCode(201);
			const qrCodes = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto[];
			expect(qrCodes.length).toBe(2);

			// Image paths must differ (each QR code has its own uploaded image)
			expect(qrCodes[0].config.image).not.toBe(qrCodes[1].config.image);

			// Both must be storage paths (not base64)
			expect(qrCodes[0].config.image).not.toContain('base64');
			expect(qrCodes[1].config.image).not.toContain('base64');
		});
	});
});

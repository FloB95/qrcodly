import { API_BASE_PATH } from '@/core/config/constants';
import { getTestServerWithUserAuth } from '@/tests/shared/test-server';
import type { FastifyInstance } from 'fastify';
import { generateQrCodeDto } from './utils';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

describe('updateQrCode', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	const updateQrCodeRequest = async (id: string, payload: object, token: string) =>
		testServer.inject({
			method: 'PATCH',
			url: `${QR_CODE_API_PATH}/${id}`,
			payload,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

	beforeAll(async () => {
		const serverSetup = await getTestServerWithUserAuth();
		testServer = serverSetup.testServer;
		accessToken = serverSetup.accessToken;
		accessToken2 = serverSetup.accessToken2;
	});

	describe('PATCH /qr-code/:id', () => {
		it('should update QR code name successfully', async () => {
			// Create a QR code first
			const createDto = generateQrCodeDto();
			const createResponse = await testServer.inject({
				method: 'POST',
				url: QR_CODE_API_PATH,
				payload: createDto,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const createdQrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;

			const updateDto = { name: 'Updated QR Code Name' };
			const response = await updateQrCodeRequest(createdQrCode.id, updateDto, accessToken);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.name).toBe(updateDto.name);
		});

		it('should update QR code config (colors, size, etc.)', async () => {
			const createDto = generateQrCodeDto();
			const createResponse = await testServer.inject({
				method: 'POST',
				url: QR_CODE_API_PATH,
				payload: createDto,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const createdQrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;

			const updateDto = {
				config: {
					...createdQrCode.config,
					width: 400,
					height: 400,
				},
			};
			const response = await updateQrCodeRequest(createdQrCode.id, updateDto, accessToken);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.config.width).toBe(400);
			expect(updatedQrCode.config.height).toBe(400);
		});

		it('should update URL content for non-editable URL QR codes', async () => {
			const createDto = generateQrCodeDto();
			const createResponse = await testServer.inject({
				method: 'POST',
				url: QR_CODE_API_PATH,
				payload: createDto,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const createdQrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;

			const updateDto = {
				content: {
					type: 'url' as const,
					data: {
						url: 'https://new-url.com',
						isEditable: false,
					},
				},
			};
			const response = await updateQrCodeRequest(createdQrCode.id, updateDto, accessToken);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.content.type).toBe('url');
			if (updatedQrCode.content.type === 'url') {
				expect(updatedQrCode.content.data.url).toBe('https://new-url.com');
			}
		});

		it('should reject content type change from url to text', async () => {
			const createDto = generateQrCodeDto(); // Creates URL type
			const createResponse = await testServer.inject({
				method: 'POST',
				url: QR_CODE_API_PATH,
				payload: createDto,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const createdQrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;

			const updateDto = {
				content: {
					type: 'text' as const,
					data: 'Some text content',
				},
			};
			const response = await updateQrCodeRequest(createdQrCode.id, updateDto, accessToken);

			expect(response.statusCode).toBe(400);
			const error = JSON.parse(response.payload) as { message: string };
			expect(error.message).toContain('content type');
		});

		it('should allow updating data within same content type', async () => {
			const createDto = generateQrCodeDto();
			const createResponse = await testServer.inject({
				method: 'POST',
				url: QR_CODE_API_PATH,
				payload: createDto,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const createdQrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;

			const updateDto = {
				content: {
					type: 'url' as const,
					data: {
						url: 'https://another-url.com',
						isEditable: false,
					},
				},
			};
			const response = await updateQrCodeRequest(createdQrCode.id, updateDto, accessToken);

			expect(response.statusCode).toBe(200);
		});

		it('should return 401 when not authenticated', async () => {
			const response = await testServer.inject({
				method: 'PATCH',
				url: `${QR_CODE_API_PATH}/some_id`,
				payload: { name: 'Test' },
			});

			expect(response.statusCode).toBe(401);
		});

		it("should return 403 when updating another user's QR code", async () => {
			// User 1 creates a QR code
			const createDto = generateQrCodeDto();
			const createResponse = await testServer.inject({
				method: 'POST',
				url: QR_CODE_API_PATH,
				payload: createDto,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const createdQrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;

			// User 2 tries to update it
			const updateDto = { name: 'Hacked' };
			const response = await updateQrCodeRequest(createdQrCode.id, updateDto, accessToken2);

			expect(response.statusCode).toBe(403);
		});

		it('should return 404 when QR code does not exist', async () => {
			const updateDto = { name: 'Test' };
			const response = await updateQrCodeRequest('non_existent_id', updateDto, accessToken);

			expect(response.statusCode).toBe(404);
		});

		it('should return 400 for invalid update payload', async () => {
			const createDto = generateQrCodeDto();
			const createResponse = await testServer.inject({
				method: 'POST',
				url: QR_CODE_API_PATH,
				payload: createDto,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const createdQrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;

			const invalidDto = {
				config: {
					width: -100, // Invalid: negative width
				},
			};
			const response = await updateQrCodeRequest(createdQrCode.id, invalidDto, accessToken);

			expect(response.statusCode).toBe(400);
		});

		it('should handle no changes gracefully', async () => {
			const createDto = generateQrCodeDto();
			const createResponse = await testServer.inject({
				method: 'POST',
				url: QR_CODE_API_PATH,
				payload: createDto,
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const createdQrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;

			// Update with same data
			const response = await updateQrCodeRequest(createdQrCode.id, {}, accessToken);

			expect(response.statusCode).toBe(200);
		});
	});
});

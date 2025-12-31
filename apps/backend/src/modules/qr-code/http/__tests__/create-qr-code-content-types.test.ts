import { API_BASE_PATH } from '@/core/config/constants';
import { getTestServerWithUserAuth } from '@/tests/shared/test-server';
import type { FastifyInstance } from 'fastify';
import {
	generateEventQrCodeDto,
	generateWifiQrCodeDto,
	generateVCardQrCodeDto,
	generateTextQrCodeDto,
	generateQrCodeDto,
} from './utils';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

describe('createQrCode - Content Types', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	const createQrCodeRequest = async (payload: object, token: string) =>
		testServer.inject({
			method: 'POST',
			url: QR_CODE_API_PATH,
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
	});

	describe('Event QR codes', () => {
		it('should create event QR code and link to dynamic short URL', async () => {
			const createDto = generateEventQrCodeDto();
			const response = await createQrCodeRequest(createDto, accessToken);

			expect(response.statusCode).toBe(201);
			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(qrCode.content.type).toBe('event');
			expect(qrCode.shortUrl).toBeDefined();
			expect(qrCode.shortUrl).not.toBeNull();
		});

		it('should set event short URL destination to DYNAMIC_QR_BASE_URL + qrCodeId', async () => {
			const createDto = generateEventQrCodeDto();
			const response = await createQrCodeRequest(createDto, accessToken);

			expect(response.statusCode).toBe(201);
			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			if (qrCode.shortUrl) {
				expect(qrCode.shortUrl.destinationUrl).toContain(qrCode.id);
			}
		});

		it('event QR code should have isActive=true short URL', async () => {
			const createDto = generateEventQrCodeDto();
			const response = await createQrCodeRequest(createDto, accessToken);

			expect(response.statusCode).toBe(201);
			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(qrCode.shortUrl?.isActive).toBe(true);
		});
	});

	describe('WiFi QR codes', () => {
		it('should create wifi QR code with encryption', async () => {
			const createDto = generateWifiQrCodeDto();
			const response = await createQrCodeRequest(createDto, accessToken);

			expect(response.statusCode).toBe(201);
			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(qrCode.content.type).toBe('wifi');
			if (qrCode.content.type === 'wifi') {
				expect(qrCode.content.data.ssid).toBeDefined();
				expect(qrCode.content.data.password).toBeDefined();
				expect(qrCode.content.data.encryption).toBeDefined();
			}
		});

		it('should validate required wifi fields (ssid)', async () => {
			const invalidDto = {
				...generateWifiQrCodeDto(),
				content: {
					type: 'wifi' as const,
					data: {
						ssid: '', // Invalid: empty ssid
						password: 'password123',
						encryption: 'WPA' as const,
					},
				},
			};
			const response = await createQrCodeRequest(invalidDto, accessToken);

			expect(response.statusCode).toBe(400);
		});
	});

	describe('vCard QR codes', () => {
		it('should create vCard QR code with contact information', async () => {
			const createDto = generateVCardQrCodeDto();
			const response = await createQrCodeRequest(createDto, accessToken);

			expect(response.statusCode).toBe(201);
			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(qrCode.content.type).toBe('vCard');
			if (qrCode.content.type === 'vCard') {
				expect(qrCode.content.data).toBeDefined();
			}
		});

		it('should handle optional vCard fields', async () => {
			const createDto = generateVCardQrCodeDto();
			if (createDto.content.type === 'vCard') {
				// Remove optional fields
				createDto.content.data = {
					firstName: 'John',
					lastName: 'Doe',
				};
			}
			const response = await createQrCodeRequest(createDto, accessToken);

			expect(response.statusCode).toBe(201);
		});
	});

	describe('Text QR codes', () => {
		it('should create text QR code', async () => {
			const createDto = generateTextQrCodeDto();
			const response = await createQrCodeRequest(createDto, accessToken);

			expect(response.statusCode).toBe(201);
			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(qrCode.content.type).toBe('text');
			if (qrCode.content.type === 'text') {
				expect(typeof qrCode.content.data).toBe('string');
			}
		});
	});

	describe('URL QR codes', () => {
		it('should create non-editable URL QR code without short URL', async () => {
			const createDto = generateQrCodeDto(); // Generates non-editable URL
			const response = await createQrCodeRequest(createDto, accessToken);

			expect(response.statusCode).toBe(201);
			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(qrCode.content.type).toBe('url');
			if (qrCode.content.type === 'url') {
				expect(qrCode.content.data.isEditable).toBe(false);
			}
			expect(qrCode.shortUrl).toBeNull();
		});
	});
});

import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import {
	generateWifiQrCodeDto,
	getTestContext,
	releaseTestContext,
	createQrCodeRequest,
} from './utils';

describe('createQrCode - WiFi Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	afterAll(async () => {
		await releaseTestContext();
	});

	const createRequest = async (payload?: TCreateQrCodeDto, token?: string) =>
		createQrCodeRequest(testServer, payload, token);

	it('should create a WiFi QR code with WPA encryption', async () => {
		const createQrCodeDto = generateWifiQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('wifi');
		if (receivedQrCode.content.type === 'wifi') {
			expect(receivedQrCode.content.data.encryption).toBe('WPA');
		}
		expect(receivedQrCode.shortUrl).toBeNull();
	});

	it('should create a WiFi QR code with WEP encryption', async () => {
		const createQrCodeDto: TCreateQrCodeDto = {
			...generateWifiQrCodeDto(),
			content: {
				type: 'wifi' as const,
				data: {
					ssid: 'test-network',
					password: 'test-password',
					encryption: 'WEP' as const,
				},
			},
		};
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('wifi');
		if (receivedQrCode.content.type === 'wifi') {
			expect(receivedQrCode.content.data.encryption).toBe('WEP');
		}
	});

	it('should create a WiFi QR code without encryption', async () => {
		const createQrCodeDto: TCreateQrCodeDto = {
			...generateWifiQrCodeDto(),
			content: {
				type: 'wifi' as const,
				data: {
					ssid: 'open-network',
					password: '',
					encryption: 'nopass' as const,
				},
			},
		};
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		if (receivedQrCode.content.type === 'wifi') {
			expect(receivedQrCode.content.data.encryption).toBe('nopass');
		}
	});

	it('should reject empty SSID', async () => {
		const invalidWifiDto: TCreateQrCodeDto = {
			...generateWifiQrCodeDto(),
			content: {
				type: 'wifi' as const,
				data: {
					ssid: '',
					password: 'password123',
					encryption: 'WPA' as const,
				},
			},
		};
		const response = await createRequest(invalidWifiDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject SSID exceeding max length (32 chars)', async () => {
		const invalidWifiDto: TCreateQrCodeDto = {
			...generateWifiQrCodeDto(),
			content: {
				type: 'wifi' as const,
				data: {
					ssid: 'a'.repeat(33),
					password: 'password123',
					encryption: 'WPA' as const,
				},
			},
		};
		const response = await createRequest(invalidWifiDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject password exceeding max length (64 chars)', async () => {
		const invalidWifiDto: TCreateQrCodeDto = {
			...generateWifiQrCodeDto(),
			content: {
				type: 'wifi' as const,
				data: {
					ssid: 'test-network',
					password: 'a'.repeat(65),
					encryption: 'WPA' as const,
				},
			},
		};
		const response = await createRequest(invalidWifiDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject invalid encryption type', async () => {
		const invalidWifiDto = {
			...generateWifiQrCodeDto(),
			content: {
				type: 'wifi' as const,
				data: {
					ssid: 'test-network',
					password: 'password123',
					encryption: 'INVALID' as any,
				},
			},
		};
		const response = await createRequest(invalidWifiDto, accessToken);
		expect(response.statusCode).toBe(400);
	});
});

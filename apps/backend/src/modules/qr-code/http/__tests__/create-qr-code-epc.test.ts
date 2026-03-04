import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { generateEpcQrCodeDto, getTestContext, createQrCodeRequest } from './utils';

describe('createQrCode - EPC Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const createRequest = async (payload?: TCreateQrCodeDto, token?: string) =>
		createQrCodeRequest(testServer, payload, token);

	it('should create an EPC QR code with all fields', async () => {
		const createQrCodeDto = generateEpcQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('epc');
		if (receivedQrCode.content.type === 'epc') {
			expect(receivedQrCode.content.data.name).toBeDefined();
			expect(receivedQrCode.content.data.iban).toBeDefined();
		}
		expect(receivedQrCode.shortUrl).toBeNull(); // EPC is not dynamic

		// Verify qrCodeData contains EPC format
		expect(receivedQrCode.qrCodeData).toContain('BCD');
		expect(receivedQrCode.qrCodeData).toContain('SCT');
	});

	it('should create an EPC QR code with required fields only', async () => {
		const createQrCodeDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Max Mustermann',
					iban: 'DE89370400440532013000',
				},
			},
		};
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('epc');

		// Verify qrCodeData format
		expect(receivedQrCode.qrCodeData).toContain('BCD');
		expect(receivedQrCode.qrCodeData).toContain('Max Mustermann');
		expect(receivedQrCode.qrCodeData).toContain('DE89370400440532013000');
	});

	it('should create an EPC QR code with BIC', async () => {
		const createQrCodeDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Test GmbH',
					iban: 'DE89370400440532013000',
					bic: 'COBADEFFXXX',
				},
			},
		};
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.qrCodeData).toContain('COBADEFFXXX');
	});

	it('should create an EPC QR code with amount', async () => {
		const createQrCodeDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Test Company',
					iban: 'DE89370400440532013000',
					amount: 150.5,
				},
			},
		};
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.qrCodeData).toContain('EUR150.50');
	});

	it('should normalize IBAN by removing spaces and converting to uppercase', async () => {
		const createQrCodeDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Test User',
					iban: 'de89 3704 0044 0532 0130 00',
				},
			},
		};
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.qrCodeData).toContain('DE89370400440532013000');
	});

	it('should reject empty beneficiary name', async () => {
		const invalidDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: '',
					iban: 'DE89370400440532013000',
				},
			},
		};
		const response = await createRequest(invalidDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject beneficiary name exceeding max length (70 chars)', async () => {
		const invalidDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'a'.repeat(71),
					iban: 'DE89370400440532013000',
				},
			},
		};
		const response = await createRequest(invalidDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject invalid IBAN format', async () => {
		const invalidDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Test User',
					iban: 'INVALID',
				},
			},
		};
		const response = await createRequest(invalidDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject IBAN that is too short', async () => {
		const invalidDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Test User',
					iban: 'DE89123',
				},
			},
		};
		const response = await createRequest(invalidDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject invalid BIC format', async () => {
		const invalidDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Test User',
					iban: 'DE89370400440532013000',
					bic: 'INVALID',
				},
			},
		};
		const response = await createRequest(invalidDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject amount below minimum (0.01)', async () => {
		const invalidDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Test User',
					iban: 'DE89370400440532013000',
					amount: 0,
				},
			},
		};
		const response = await createRequest(invalidDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject amount exceeding max (999999999.99)', async () => {
		const invalidDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Test User',
					iban: 'DE89370400440532013000',
					amount: 1000000000,
				},
			},
		};
		const response = await createRequest(invalidDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject purpose exceeding max length (140 chars)', async () => {
		const invalidDto: TCreateQrCodeDto = {
			...generateEpcQrCodeDto(),
			content: {
				type: 'epc' as const,
				data: {
					name: 'Test User',
					iban: 'DE89370400440532013000',
					purpose: 'a'.repeat(141),
				},
			},
		};
		const response = await createRequest(invalidDto, accessToken);
		expect(response.statusCode).toBe(400);
	});
});

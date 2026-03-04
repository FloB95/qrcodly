import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import {
	generateQrCodeDto,
	generateEditableUrlQrCodeDto,
	generateDynamicVCardQrCodeDto,
	generateEventQrCodeDto,
	generateTextQrCodeDto,
	generateWifiQrCodeDto,
	generateVCardQrCodeDto,
	generateEmailQrCodeDto,
	generateLocationQrCodeDto,
	getTestContext,
	createQrCodeRequest,
} from './utils';

describe('createQrCode - Core', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const createRequest = async (payload?: TCreateQrCodeDto, token?: string) =>
		createQrCodeRequest(testServer, payload, token);

	const assertQrCodeResponse = (response: TQrCodeWithRelationsResponseDto) => {
		expect(response.id).toEqual(expect.any(String));
		expect(response.createdAt).toEqual(expect.any(String));
		expect(['string', 'object']).toContain(typeof response.updatedAt);

		expect(response.config).toBeDefined();
		expect(response.config.width).toEqual(expect.any(Number));
		expect(response.config.height).toEqual(expect.any(Number));
		expect(response.config.margin).toEqual(expect.any(Number));
		expect(response.config.dotsOptions).toBeDefined();
		expect(response.config.cornersSquareOptions).toBeDefined();
		expect(response.config.cornersDotOptions).toBeDefined();
		expect(response.config.backgroundOptions).toBeDefined();
		if (response.config.image) expect(response.config.image).toEqual(expect.any(String));

		expect(response.content).toBeDefined();
		expect(response.previewImage).toBeNull();

		if (response.shortUrl !== null) {
			expect(response.shortUrl).toBeDefined();
		} else {
			expect(response.shortUrl).toBeNull();
		}
	};

	describe('Basic Creation', () => {
		it('should create a QR code and return status code 201', async () => {
			const createQrCodeDto = generateQrCodeDto();
			const response = await createRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode);
		});

		it('should create a QR code without user and not store it', async () => {
			const createQrCodeDto = generateQrCodeDto();
			const response = await createRequest(createQrCodeDto);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode);
		});
	});

	describe('Error Handling', () => {
		it('should return 400 for invalid request body', async () => {
			// @ts-expect-error - Testing invalid request body
			const response = await createRequest({}, accessToken);
			expect(response.statusCode).toBe(400);

			const { message, code, fieldErrors } = JSON.parse(response.payload);
			expect(message).toBeDefined();
			expect(code).toBe(400);
			expect(Array.isArray(fieldErrors)).toBe(true);
			expect(fieldErrors.length).toBeGreaterThan(0);
		});

		it('should return 400 when content is missing', async () => {
			const invalidDto = {
				name: 'Test',
				config: generateQrCodeDto().config,
			};
			// @ts-expect-error - Testing invalid request body
			const response = await createRequest(invalidDto, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should return 400 when config is missing', async () => {
			const invalidDto = {
				name: 'Test',
				content: generateQrCodeDto().content,
			};
			// @ts-expect-error - Testing invalid request body
			const response = await createRequest(invalidDto, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should return 400 for invalid content type', async () => {
			const invalidDto = {
				...generateQrCodeDto(),
				content: {
					type: 'invalid-type',
					data: {},
				},
			};
			const response = await createRequest(invalidDto as any, accessToken);
			expect(response.statusCode).toBe(400);
		});
	});

	describe('Dynamic QR Code Authentication', () => {
		describe('should reject unauthenticated users for dynamic QR codes', () => {
			it('should reject editable URL QR code without authentication', async () => {
				const dto = generateEditableUrlQrCodeDto();
				const response = await createRequest(dto); // No token

				expect(response.statusCode).toBe(401);
				const error = JSON.parse(response.payload);
				expect(error.message).toContain('dynamic QR codes');
			});

			it('should reject dynamic vCard QR code without authentication', async () => {
				const dto = generateDynamicVCardQrCodeDto();
				const response = await createRequest(dto); // No token

				expect(response.statusCode).toBe(401);
				const error = JSON.parse(response.payload);
				expect(error.message).toContain('dynamic QR codes');
			});

			it('should reject event QR code without authentication', async () => {
				const dto = generateEventQrCodeDto();
				const response = await createRequest(dto); // No token

				expect(response.statusCode).toBe(401);
				const error = JSON.parse(response.payload);
				expect(error.message).toContain('dynamic QR codes');
			});
		});

		describe('should allow unauthenticated users for static QR codes', () => {
			it('should allow static URL QR code without authentication', async () => {
				const dto = generateQrCodeDto(); // Static URL (isEditable: false)
				const response = await createRequest(dto); // No token

				expect(response.statusCode).toBe(201);
			});

			it('should allow text QR code without authentication', async () => {
				const dto = generateTextQrCodeDto();
				const response = await createRequest(dto); // No token

				expect(response.statusCode).toBe(201);
			});

			it('should allow WiFi QR code without authentication', async () => {
				const dto = generateWifiQrCodeDto();
				const response = await createRequest(dto); // No token

				expect(response.statusCode).toBe(201);
			});

			it('should allow static vCard QR code without authentication', async () => {
				const dto = generateVCardQrCodeDto(); // Static vCard (isDynamic: false/undefined)
				const response = await createRequest(dto); // No token

				expect(response.statusCode).toBe(201);
			});

			it('should allow email QR code without authentication', async () => {
				const dto = generateEmailQrCodeDto();
				const response = await createRequest(dto); // No token

				expect(response.statusCode).toBe(201);
			});

			it('should allow location QR code without authentication', async () => {
				const dto = generateLocationQrCodeDto();
				const response = await createRequest(dto); // No token

				expect(response.statusCode).toBe(201);
			});
		});

		describe('should allow authenticated users for dynamic QR codes', () => {
			it('should allow editable URL QR code with authentication', async () => {
				const dto = generateEditableUrlQrCodeDto();
				const response = await createRequest(dto, accessToken);

				expect(response.statusCode).toBe(201);
				const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
				expect(qrCode.shortUrl).toBeDefined();
			});

			it('should allow dynamic vCard QR code with authentication', async () => {
				const dto = generateDynamicVCardQrCodeDto();
				const response = await createRequest(dto, accessToken);

				expect(response.statusCode).toBe(201);
				const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
				expect(qrCode.shortUrl).toBeDefined();
			});

			it('should allow event QR code with authentication', async () => {
				const dto = generateEventQrCodeDto();
				const response = await createRequest(dto, accessToken);

				expect(response.statusCode).toBe(201);
				const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
				expect(qrCode.shortUrl).toBeDefined();
			});
		});
	});
});

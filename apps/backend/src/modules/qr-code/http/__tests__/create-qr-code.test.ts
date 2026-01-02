import { API_BASE_PATH } from '@/core/config/constants';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import {
	generateQrCodeDto,
	generateEditableUrlQrCodeDto,
	generateTextQrCodeDto,
	generateWifiQrCodeDto,
	generateVCardQrCodeDto,
	generateDynamicVCardQrCodeDto,
	generateEmailQrCodeDto,
	generateLocationQrCodeDto,
	generateEventQrCodeDto,
} from './utils';
import { type TCreateQrCodeDto, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

describe('createQrCode', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	const createQrCodeRequest = async (payload?: TCreateQrCodeDto, token?: string) =>
		testServer.inject({
			method: 'POST',
			url: QR_CODE_API_PATH,
			payload,
			headers: {
				'Content-Type': 'application/json',
				Authorization: token ? `Bearer ${token}` : '',
			},
		});

	beforeAll(async () => {
		const serverSetup = await getTestServerWithUserAuth();
		testServer = serverSetup.testServer;
		accessToken = serverSetup.accessToken;
	});

	afterAll(async () => {
		await shutDownServer();
	});

	const assertQrCodeResponse = (
		response: TQrCodeWithRelationsResponseDto,
		_createdByExpected: string | null,
	) => {
		expect(response.id).toEqual(expect.any(String));
		expect(response.createdAt).toEqual(expect.any(String));
		expect(['string', 'object', 'null']).toContain(typeof response.updatedAt);

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

	it('should create a QR code and return status code 201', async () => {
		const createQrCodeDto = generateQrCodeDto();
		const response = await createQrCodeRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		assertQrCodeResponse(receivedQrCode, expect.any(String));
	});

	it('should create a QR code without user and not store it', async () => {
		const createQrCodeDto = generateQrCodeDto();
		const response = await createQrCodeRequest(createQrCodeDto);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		assertQrCodeResponse(receivedQrCode, null);
	});

	it('should return 400 for invalid request body', async () => {
		// @ts-expect-error - Testing invalid request body
		const response = await createQrCodeRequest({}, accessToken);
		expect(response.statusCode).toBe(400);

		const { message, code, fieldErrors } = JSON.parse(response.payload);
		expect(message).toBeDefined();
		expect(code).toBe(400);
		expect(Array.isArray(fieldErrors)).toBe(true);

		expect(fieldErrors.length).toBeGreaterThan(0);
	});

	describe('URL Content Type', () => {
		it('should create a static URL QR code (isEditable: false)', async () => {
			const createQrCodeDto = generateQrCodeDto(); // Default is static URL
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode, expect.any(String));

			expect(receivedQrCode.content.type).toBe('url');
			// @ts-expect-error - Data is from type url here
			expect(receivedQrCode.content.data.isEditable).toBe(false);
			expect(receivedQrCode.shortUrl).toBeNull(); // Static URLs don't create short URLs
		});

		it('should create a dynamic URL QR code (isEditable: true)', async () => {
			const createQrCodeDto = generateEditableUrlQrCodeDto();
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode, expect.any(String));

			expect(receivedQrCode.content.type).toBe('url');
			// @ts-expect-error - Data is from type url here
			expect(receivedQrCode.content.data.isEditable).toBe(true);
			expect(receivedQrCode.shortUrl).toBeDefined(); // Dynamic URLs should have short URL
			expect(receivedQrCode.shortUrl?.shortCode).toEqual(expect.any(String));
			// @ts-expect-error - Data is from type url here
			expect(receivedQrCode.shortUrl?.destinationUrl).toBe(createQrCodeDto.content.data.url);
			expect(receivedQrCode.shortUrl?.isActive).toBe(true);
		});

		it('should validate URL format', async () => {
			const invalidUrlDto: TCreateQrCodeDto = {
				...generateQrCodeDto(),
				content: {
					type: 'url' as const,
					data: {
						url: 'not-a-valid-url',
						isEditable: false,
					},
				},
			};
			const response = await createQrCodeRequest(invalidUrlDto, accessToken);
			expect(response.statusCode).toBe(400);
		});
	});

	describe('Text Content Type', () => {
		it('should create a text QR code', async () => {
			const createQrCodeDto = generateTextQrCodeDto();
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode, expect.any(String));

			expect(receivedQrCode.content.type).toBe('text');
			expect(receivedQrCode.content.data).toBe(createQrCodeDto.content.data);
			expect(receivedQrCode.shortUrl).toBeNull(); // Text QR codes don't have short URLs
		});

		it('should handle empty text', async () => {
			const emptyTextDto: TCreateQrCodeDto = {
				...generateTextQrCodeDto(),
				content: {
					type: 'text' as const,
					data: '',
				},
			};
			const response = await createQrCodeRequest(emptyTextDto, accessToken);
			expect(response.statusCode).toBe(400);
		});
	});

	describe('WiFi Content Type', () => {
		it('should create a WiFi QR code with WPA encryption', async () => {
			const createQrCodeDto = generateWifiQrCodeDto();
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode, expect.any(String));

			expect(receivedQrCode.content.type).toBe('wifi');
			// @ts-expect-error - Data is from type wifi here
			expect(receivedQrCode.content.data.ssid).toBe(createQrCodeDto.content.data.ssid);
			// @ts-expect-error - Data is from type wifi here
			expect(receivedQrCode.content.data.password).toBe(createQrCodeDto.content.data.password);
			// @ts-expect-error - Data is from type wifi here
			expect(receivedQrCode.content.data.encryption).toBe('WPA');
			expect(receivedQrCode.shortUrl).toBeNull();
		});

		it('should create a WiFi QR code with WEP encryption', async () => {
			const createQrCodeDto = {
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
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			// @ts-expect-error - Data is from type wifi here
			expect(receivedQrCode.content.data.encryption).toBe('WEP');
		});

		it('should create a WiFi QR code without encryption', async () => {
			const createQrCodeDto: TCreateQrCodeDto = {
				...generateWifiQrCodeDto(),
				content: {
					type: 'wifi' as const,
					data: {
						ssid: 'open-network',
						password: '', // Empty password for open networks
						encryption: 'nopass' as const,
					},
				},
			};
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			// @ts-expect-error - Data is from type wifi here
			expect(receivedQrCode.content.data.encryption).toBe('nopass');
		});
	});

	describe('vCard Content Type', () => {
		it('should create a static vCard QR code (isDynamic: false)', async () => {
			const createQrCodeDto = generateVCardQrCodeDto();
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode, expect.any(String));

			expect(receivedQrCode.content.type).toBe('vCard');
			// @ts-expect-error - Data is from type vCard here
			expect(receivedQrCode.content.data.firstName).toBe(createQrCodeDto.content.data.firstName);
			// @ts-expect-error - Data is from type vCard here
			expect(receivedQrCode.content.data.lastName).toBe(createQrCodeDto.content.data.lastName);
			// @ts-expect-error - Data is from type vCard here
			expect(receivedQrCode.content.data.email).toBe(createQrCodeDto.content.data.email);
			// @ts-expect-error - Data is from type vCard here
			expect(receivedQrCode.content.data.phone).toBe(createQrCodeDto.content.data.phone);
			// @ts-expect-error - Data is from type vCard here
			expect(receivedQrCode.content.data.company).toBe(createQrCodeDto.content.data.company);
			// @ts-expect-error - Data is from type vCard here
			expect(receivedQrCode.content.data.isDynamic).toBeUndefined(); // Static vCards don't have isDynamic
			expect(receivedQrCode.shortUrl).toBeNull(); // Static vCards don't create short URLs
		});

		it('should create a dynamic vCard QR code (isDynamic: true)', async () => {
			const createQrCodeDto = generateDynamicVCardQrCodeDto();
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode, expect.any(String));

			expect(receivedQrCode.content.type).toBe('vCard');
			// @ts-expect-error - Data is from type vCard here
			expect(receivedQrCode.content.data.isDynamic).toBe(true);
			expect(receivedQrCode.shortUrl).toBeDefined(); // Dynamic vCards should have short URL
			expect(receivedQrCode.shortUrl?.shortCode).toEqual(expect.any(String));
			expect(receivedQrCode.shortUrl?.destinationUrl).toContain(receivedQrCode.id); // Should point to download endpoint
			expect(receivedQrCode.shortUrl?.isActive).toBe(true);
		});

		it('should validate email format in vCard', async () => {
			const invalidEmailDto = {
				...generateVCardQrCodeDto(),
				content: {
					type: 'vCard' as const,
					data: {
						firstName: 'John',
						lastName: 'Doe',
						email: 'invalid-email',
					},
				},
			};
			const response = await createQrCodeRequest(invalidEmailDto, accessToken);
			expect(response.statusCode).toBe(400);
		});
	});

	describe('Email Content Type', () => {
		it('should create an email QR code', async () => {
			const createQrCodeDto = generateEmailQrCodeDto();
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode, expect.any(String));

			expect(receivedQrCode.content.type).toBe('email');
			// @ts-expect-error - Data is from type email here
			expect(receivedQrCode.content.data.email).toBe(createQrCodeDto.content.data.email);
			// @ts-expect-error - Data is from type email here
			expect(receivedQrCode.content.data.subject).toBe(createQrCodeDto.content.data.subject);
			// @ts-expect-error - Data is from type email here
			expect(receivedQrCode.content.data.body).toBe(createQrCodeDto.content.data.body);
			expect(receivedQrCode.shortUrl).toBeNull();
		});

		it('should validate email format', async () => {
			const invalidEmailDto = {
				...generateEmailQrCodeDto(),
				content: {
					type: 'email' as const,
					data: {
						email: 'not-an-email',
						subject: 'Test',
						message: 'Test message',
					},
				},
			};
			const response = await createQrCodeRequest(invalidEmailDto, accessToken);
			expect(response.statusCode).toBe(400);
		});
	});

	describe('Location Content Type', () => {
		it('should create a location QR code', async () => {
			const createQrCodeDto = generateLocationQrCodeDto();
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode, expect.any(String));

			expect(receivedQrCode.content.type).toBe('location');
			// @ts-expect-error - Data is from type location here
			expect(receivedQrCode.content.data.latitude).toBe(createQrCodeDto.content.data.latitude);
			// @ts-expect-error - Data is from type location here
			expect(receivedQrCode.content.data.longitude).toBe(createQrCodeDto.content.data.longitude);
			// @ts-expect-error - Data is from type location here
			expect(receivedQrCode.content.data.address).toBe(createQrCodeDto.content.data.address);
			expect(receivedQrCode.shortUrl).toBeNull();
		});

		it('should validate latitude range (-90 to 90)', async () => {
			const invalidLatDto = {
				...generateLocationQrCodeDto(),
				content: {
					type: 'location' as const,
					data: {
						latitude: 100,
						longitude: 0,
						address: 'Test Address',
					},
				},
			};
			const response = await createQrCodeRequest(invalidLatDto, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should validate longitude range (-180 to 180)', async () => {
			const invalidLngDto = {
				...generateLocationQrCodeDto(),
				content: {
					type: 'location' as const,
					data: {
						latitude: 0,
						longitude: 200,
						address: 'Test Address',
					},
				},
			};
			const response = await createQrCodeRequest(invalidLngDto, accessToken);
			expect(response.statusCode).toBe(400);
		});
	});

	describe('Event Content Type', () => {
		it('should create an event QR code (always dynamic)', async () => {
			const createQrCodeDto = generateEventQrCodeDto();
			const response = await createQrCodeRequest(createQrCodeDto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			assertQrCodeResponse(receivedQrCode, expect.any(String));

			expect(receivedQrCode.content.type).toBe('event');
			// @ts-expect-error - Data is from type event here
			expect(receivedQrCode.content.data.title).toBe(createQrCodeDto.content.data.title);
			// @ts-expect-error - Data is from type event here
			expect(receivedQrCode.content.data.location).toBe(createQrCodeDto.content.data.location);
			// @ts-expect-error - Data is from type event here
			expect(receivedQrCode.content.data.startDate).toBe(createQrCodeDto.content.data.startDate);
			// @ts-expect-error - Data is from type event here
			expect(receivedQrCode.content.data.endDate).toBe(createQrCodeDto.content.data.endDate);
			// @ts-expect-error - Data is from type event here
			expect(receivedQrCode.content.data.description).toBe(
				// @ts-expect-error - Data is from type event here
				createQrCodeDto.content.data.description,
			);
			expect(receivedQrCode.shortUrl).toBeDefined(); // Events are always dynamic
			expect(receivedQrCode.shortUrl?.shortCode).toEqual(expect.any(String));
			expect(receivedQrCode.shortUrl?.destinationUrl).toContain(receivedQrCode.id);
			expect(receivedQrCode.shortUrl?.isActive).toBe(true);
		});

		it('should validate date format for event', async () => {
			const invalidDateDto = {
				...generateEventQrCodeDto(),
				content: {
					type: 'event' as const,
					data: {
						title: 'Test Event',
						startDate: 'not-a-date',
						endDate: new Date().toISOString(),
					},
				},
			};
			const response = await createQrCodeRequest(invalidDateDto, accessToken);
			expect(response.statusCode).toBe(400);
		});
	});

	describe('QR Code Configuration', () => {
		it('should accept custom QR code styling configuration', async () => {
			const customConfig: TCreateQrCodeDto = {
				...generateQrCodeDto(),
				config: {
					width: 500,
					height: 500,
					margin: 10,
					imageOptions: {
						hideBackgroundDots: true,
					},
					dotsOptions: {
						style: {
							type: 'hex',
							value: '#FF5733',
						},
						type: 'rounded',
					},
					cornersSquareOptions: {
						style: {
							type: 'hex',
							value: '#000000',
						},
						type: 'extra-rounded',
					},
					cornersDotOptions: {
						style: {
							type: 'hex',
							value: '#000000',
						},
						type: 'dot',
					},
					backgroundOptions: {
						style: {
							type: 'hex',
							value: '#FFFFFF',
						},
					},
				},
			};

			const response = await createQrCodeRequest(customConfig, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(receivedQrCode.config.width).toBe(500);
			expect(receivedQrCode.config.height).toBe(500);
			// @ts-expect-error - Ignore here
			expect(receivedQrCode.config.dotsOptions.style.value).toBe('#FF5733');
		});
	});
});

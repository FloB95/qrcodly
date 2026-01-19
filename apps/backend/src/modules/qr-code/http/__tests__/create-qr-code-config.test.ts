import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import {
	generateQrCodeDto,
	getTestContext,
	releaseTestContext,
	createQrCodeRequest,
} from './utils';

describe('createQrCode - Name and Configuration', () => {
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

	describe('QR Code Name', () => {
		it('should create QR code with valid name', async () => {
			const dto: TCreateQrCodeDto = {
				...generateQrCodeDto(),
				name: 'My QR Code',
			};
			const response = await createRequest(dto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(receivedQrCode.name).toBe('My QR Code');
		});

		it('should create QR code with null name', async () => {
			const dto: TCreateQrCodeDto = {
				...generateQrCodeDto(),
				name: null,
			};
			const response = await createRequest(dto, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(receivedQrCode.name).toBeNull();
		});

		it('should reject name exceeding max length (32 chars)', async () => {
			const dto: TCreateQrCodeDto = {
				...generateQrCodeDto(),
				name: 'a'.repeat(33),
			};
			const response = await createRequest(dto, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should accept name at max length (32 chars)', async () => {
			const dto: TCreateQrCodeDto = {
				...generateQrCodeDto(),
				name: 'a'.repeat(32),
			};
			const response = await createRequest(dto, accessToken);
			expect(response.statusCode).toBe(201);
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

			const response = await createRequest(customConfig, accessToken);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(receivedQrCode.config.width).toBe(500);
			expect(receivedQrCode.config.height).toBe(500);
			if (receivedQrCode.config.dotsOptions.style.type === 'hex') {
				expect(receivedQrCode.config.dotsOptions.style.value).toBe('#FF5733');
			}
		});

		it('should reject negative width', async () => {
			const invalidConfig = {
				...generateQrCodeDto(),
				config: {
					...generateQrCodeDto().config,
					width: -100,
				},
			};
			const response = await createRequest(invalidConfig, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should reject negative height', async () => {
			const invalidConfig = {
				...generateQrCodeDto(),
				config: {
					...generateQrCodeDto().config,
					height: -100,
				},
			};
			const response = await createRequest(invalidConfig, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should reject negative margin', async () => {
			const invalidConfig = {
				...generateQrCodeDto(),
				config: {
					...generateQrCodeDto().config,
					margin: -10,
				},
			};
			const response = await createRequest(invalidConfig, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should reject invalid hex color format', async () => {
			const invalidColorConfig = {
				...generateQrCodeDto(),
				config: {
					...generateQrCodeDto().config,
					dotsOptions: {
						type: 'rounded' as const,
						style: {
							type: 'hex' as const,
							value: 'not-a-hex-color',
						},
					},
				},
			};
			const response = await createRequest(invalidColorConfig, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should reject invalid dot type', async () => {
			const invalidDotTypeConfig = {
				...generateQrCodeDto(),
				config: {
					...generateQrCodeDto().config,
					dotsOptions: {
						type: 'invalid-type' as any,
						style: {
							type: 'hex' as const,
							value: '#000000',
						},
					},
				},
			};
			const response = await createRequest(invalidDotTypeConfig, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should accept gradient color style', async () => {
			const gradientConfig: TCreateQrCodeDto = {
				...generateQrCodeDto(),
				config: {
					...generateQrCodeDto().config,
					dotsOptions: {
						type: 'rounded',
						style: {
							type: 'gradient',
							gradientType: 'linear',
							rotation: 45,
							colorStops: [
								{ offset: 0, color: '#ff0000' },
								{ offset: 1, color: '#0000ff' },
							],
						},
					},
				},
			};
			const response = await createRequest(gradientConfig, accessToken);
			expect(response.statusCode).toBe(201);
		});

		it('should accept rgba color style', async () => {
			const rgbaConfig: TCreateQrCodeDto = {
				...generateQrCodeDto(),
				config: {
					...generateQrCodeDto().config,
					backgroundOptions: {
						style: {
							type: 'rgba',
							value: 'rgba(255, 255, 255, 0.5)',
						},
					},
				},
			};
			const response = await createRequest(rgbaConfig, accessToken);
			expect(response.statusCode).toBe(201);
		});

		it('should accept all valid dot types', async () => {
			const dotTypes = ['dots', 'rounded', 'classy', 'classy-rounded', 'square', 'extra-rounded'];

			for (const dotType of dotTypes) {
				const dto: TCreateQrCodeDto = {
					...generateQrCodeDto(),
					config: {
						...generateQrCodeDto().config,
						dotsOptions: {
							type: dotType as any,
							style: {
								type: 'hex',
								value: '#000000',
							},
						},
					},
				};
				const response = await createRequest(dto, accessToken);
				expect(response.statusCode).toBe(201);
			}
		});

		it('should accept all valid corner square types', async () => {
			const cornerTypes = ['dot', 'square', 'extra-rounded'];

			for (const cornerType of cornerTypes) {
				const dto: TCreateQrCodeDto = {
					...generateQrCodeDto(),
					config: {
						...generateQrCodeDto().config,
						cornersSquareOptions: {
							type: cornerType as any,
							style: {
								type: 'hex',
								value: '#000000',
							},
						},
					},
				};
				const response = await createRequest(dto, accessToken);
				expect(response.statusCode).toBe(201);
			}
		});

		it('should accept all valid corner dot types', async () => {
			const cornerDotTypes = ['dot', 'square'];

			for (const cornerDotType of cornerDotTypes) {
				const dto: TCreateQrCodeDto = {
					...generateQrCodeDto(),
					config: {
						...generateQrCodeDto().config,
						cornersDotOptions: {
							type: cornerDotType as any,
							style: {
								type: 'hex',
								value: '#000000',
							},
						},
					},
				};
				const response = await createRequest(dto, accessToken);
				expect(response.statusCode).toBe(201);
			}
		});
	});
});

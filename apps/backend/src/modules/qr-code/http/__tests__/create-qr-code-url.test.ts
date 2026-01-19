import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import {
	generateQrCodeDto,
	generateEditableUrlQrCodeDto,
	getTestContext,
	releaseTestContext,
	createQrCodeRequest,
} from './utils';

describe('createQrCode - URL Content Type', () => {
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

	it('should create a static URL QR code (isEditable: false)', async () => {
		const createQrCodeDto = generateQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('url');
		if (receivedQrCode.content.type === 'url') {
			expect(receivedQrCode.content.data.isEditable).toBe(false);
		}
		expect(receivedQrCode.shortUrl).toBeNull();

		// Verify qrCodeData contains the raw URL for static URL QR codes
		if (createQrCodeDto.content.type === 'url') {
			expect(receivedQrCode.qrCodeData).toBe(createQrCodeDto.content.data.url);
		}
	});

	it('should create a dynamic URL QR code (isEditable: true)', async () => {
		const createQrCodeDto = generateEditableUrlQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('url');
		if (receivedQrCode.content.type === 'url') {
			expect(receivedQrCode.content.data.isEditable).toBe(true);
		}
		expect(receivedQrCode.shortUrl).toBeDefined();
		expect(receivedQrCode.shortUrl?.shortCode).toEqual(expect.any(String));
		if (createQrCodeDto.content.type === 'url') {
			expect(receivedQrCode.shortUrl?.destinationUrl).toBe(createQrCodeDto.content.data.url);
		}
		expect(receivedQrCode.shortUrl?.isActive).toBe(true);

		// Verify qrCodeData contains the short URL for dynamic URL QR codes
		expect(receivedQrCode.qrCodeData).toContain('/u/');
		expect(receivedQrCode.qrCodeData).toContain(receivedQrCode.shortUrl?.shortCode);
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
		const response = await createRequest(invalidUrlDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject URL exceeding max length (1000 chars)', async () => {
		const longUrl = 'https://example.com/' + 'a'.repeat(1000);
		const invalidUrlDto: TCreateQrCodeDto = {
			...generateQrCodeDto(),
			content: {
				type: 'url' as const,
				data: {
					url: longUrl,
					isEditable: false,
				},
			},
		};
		const response = await createRequest(invalidUrlDto, accessToken);
		expect(response.statusCode).toBe(400);
	});
});

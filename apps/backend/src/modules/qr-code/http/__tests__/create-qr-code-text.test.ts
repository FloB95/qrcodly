import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { generateTextQrCodeDto, getTestContext, createQrCodeRequest } from './utils';

describe('createQrCode - Text Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const createRequest = async (payload?: TCreateQrCodeDto, token?: string) =>
		createQrCodeRequest(testServer, payload, token);

	it('should create a text QR code', async () => {
		const createQrCodeDto = generateTextQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('text');
		expect(receivedQrCode.content.data).toBe(createQrCodeDto.content.data);
		expect(receivedQrCode.shortUrl).toBeNull();

		// Verify qrCodeData contains the raw text for text QR codes
		expect(receivedQrCode.qrCodeData).toBe(createQrCodeDto.content.data);
	});

	it('should reject empty text', async () => {
		const emptyTextDto: TCreateQrCodeDto = {
			...generateTextQrCodeDto(),
			content: {
				type: 'text' as const,
				data: '',
			},
		};
		const response = await createRequest(emptyTextDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject text exceeding max length (1000 chars)', async () => {
		const longText = 'a'.repeat(1001);
		const invalidTextDto: TCreateQrCodeDto = {
			...generateTextQrCodeDto(),
			content: {
				type: 'text' as const,
				data: longText,
			},
		};
		const response = await createRequest(invalidTextDto, accessToken);
		expect(response.statusCode).toBe(400);
	});
});

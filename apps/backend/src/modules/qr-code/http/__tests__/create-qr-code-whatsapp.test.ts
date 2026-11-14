import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { generateWhatsAppQrCodeDto, getTestContext, createQrCodeRequest } from './utils';
import { resetTestState } from '@/tests/shared/test-context';

describe('createQrCode - WhatsApp Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const createRequest = async (payload?: TCreateQrCodeDto, token?: string) =>
		createQrCodeRequest(testServer, payload, token);

	const withWhatsApp = (phone: string, message?: string): TCreateQrCodeDto => ({
		...generateWhatsAppQrCodeDto(),
		content: { type: 'whatsapp', data: { phone, message } },
	});

	it('should create a WhatsApp QR code with a wa.me payload', async () => {
		const response = await createRequest(
			withWhatsApp('+49 170 1234567', 'Hello there'),
			accessToken,
		);
		expect(response).toHaveStatusCode(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('whatsapp');
		if (receivedQrCode.content.type === 'whatsapp') {
			expect(receivedQrCode.content.data.phone).toBe('+49 170 1234567');
			expect(receivedQrCode.content.data.message).toBe('Hello there');
		}
		expect(receivedQrCode.shortUrl).toBeNull(); // WhatsApp QR codes are static
		expect(receivedQrCode.qrCodeData).toBe('https://wa.me/491701234567?text=Hello%20there');
	});

	it('should omit the text parameter when there is no message', async () => {
		const response = await createRequest(withWhatsApp('+49 (170) 123-4567'), accessToken);
		expect(response).toHaveStatusCode(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.qrCodeData).toBe('https://wa.me/491701234567');
	});

	it('should URL-encode special characters in the message', async () => {
		const response = await createRequest(
			withWhatsApp('+1 (555) 123-4567', 'Hallo Welt & Co?'),
			accessToken,
		);
		expect(response).toHaveStatusCode(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.qrCodeData).toBe(
			'https://wa.me/15551234567?text=Hallo%20Welt%20%26%20Co%3F',
		);
	});

	it('should reject a phone number without a leading + and country code', async () => {
		const response = await createRequest(withWhatsApp('0170 1234567', 'Hello'), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject a phone number with too few digits', async () => {
		const response = await createRequest(withWhatsApp('+49 12', 'Hello'), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject a phone number with more than 15 digits', async () => {
		const response = await createRequest(withWhatsApp(`+${'1'.repeat(16)}`), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject letters in the phone number', async () => {
		const response = await createRequest(withWhatsApp('+49 abc', 'Hello'), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject an empty phone number', async () => {
		const response = await createRequest(withWhatsApp('', 'Hello'), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject a message exceeding max length (500 chars)', async () => {
		const response = await createRequest(
			withWhatsApp('+49 170 1234567', 'a'.repeat(501)),
			accessToken,
		);
		expect(response).toHaveStatusCode(400);
	});
});

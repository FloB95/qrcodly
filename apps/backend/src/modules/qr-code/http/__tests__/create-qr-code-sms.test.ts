import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { generateSmsQrCodeDto, getTestContext, createQrCodeRequest } from './utils';
import { resetTestState } from '@/tests/shared/test-context';

describe('createQrCode - SMS Content Type', () => {
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

	const withSms = (phone: string, message?: string): TCreateQrCodeDto => ({
		...generateSmsQrCodeDto(),
		content: { type: 'sms', data: { phone, message } },
	});

	it('should create an SMS QR code with an SMSTO payload', async () => {
		const response = await createRequest(withSms('+49 170 1234567', 'Hello there'), accessToken);
		expect(response).toHaveStatusCode(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('sms');
		if (receivedQrCode.content.type === 'sms') {
			expect(receivedQrCode.content.data.phone).toBe('+49 170 1234567');
			expect(receivedQrCode.content.data.message).toBe('Hello there');
		}
		expect(receivedQrCode.shortUrl).toBeNull(); // SMS QR codes are static
		expect(receivedQrCode.qrCodeData).toBe('SMSTO:+491701234567:Hello there');
	});

	it('should create an SMS QR code without a message', async () => {
		const response = await createRequest(withSms('+49 (170) 123-4567'), accessToken);
		expect(response).toHaveStatusCode(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.qrCodeData).toBe('SMSTO:+491701234567:');
	});

	it('should treat an empty message like a missing one', async () => {
		const response = await createRequest(withSms('0170 1234567', ''), accessToken);
		expect(response).toHaveStatusCode(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.qrCodeData).toBe('SMSTO:01701234567:');
	});

	it('should accept a message of exactly 500 characters', async () => {
		const response = await createRequest(withSms('+49 170 1234567', 'a'.repeat(500)), accessToken);
		expect(response).toHaveStatusCode(201);
	});

	it('should reject a message exceeding max length (500 chars)', async () => {
		const response = await createRequest(withSms('+49 170 1234567', 'a'.repeat(501)), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject an empty phone number', async () => {
		const response = await createRequest(withSms('', 'Hello'), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject an invalid phone number', async () => {
		const response = await createRequest(withSms('not a number', 'Hello'), accessToken);
		expect(response).toHaveStatusCode(400);
	});
});

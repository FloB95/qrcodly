import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { generatePhoneQrCodeDto, getTestContext, createQrCodeRequest } from './utils';
import { resetTestState } from '@/tests/shared/test-context';

describe('createQrCode - Phone Content Type', () => {
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

	const withPhone = (phone: string): TCreateQrCodeDto => ({
		...generatePhoneQrCodeDto(),
		content: { type: 'phone', data: { phone } },
	});

	it('should create a phone QR code with a tel: payload', async () => {
		const createQrCodeDto = generatePhoneQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response).toHaveStatusCode(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('phone');
		if (receivedQrCode.content.type === 'phone' && createQrCodeDto.content.type === 'phone') {
			expect(receivedQrCode.content.data.phone).toBe(createQrCodeDto.content.data.phone);
		}
		expect(receivedQrCode.shortUrl).toBeNull(); // phone QR codes are static
		expect(receivedQrCode.qrCodeData).toMatch(/^tel:\+49170\d{7}$/);
	});

	it('should strip spaces, dashes, dots and parentheses from the payload', async () => {
		const response = await createRequest(withPhone('+49 (170) 123-45.67'), accessToken);
		expect(response).toHaveStatusCode(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.qrCodeData).toBe('tel:+491701234567');
		if (receivedQrCode.content.type === 'phone') {
			expect(receivedQrCode.content.data.phone).toBe('+49 (170) 123-45.67');
		}
	});

	it('should keep local numbers without a country code', async () => {
		const response = await createRequest(withPhone('0170/1234567'), accessToken);
		expect(response).toHaveStatusCode(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.qrCodeData).toBe('tel:01701234567');
	});

	it('should reject an empty phone number', async () => {
		const response = await createRequest(withPhone(''), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject letters in the phone number', async () => {
		const response = await createRequest(withPhone('call me'), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject a phone number with fewer than 3 digits', async () => {
		const response = await createRequest(withPhone('12'), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject a phone number with more than 20 digits', async () => {
		const response = await createRequest(withPhone('1'.repeat(21)), accessToken);
		expect(response).toHaveStatusCode(400);
	});

	it('should reject a phone number exceeding max length (32 chars)', async () => {
		const response = await createRequest(withPhone(`+${'1 '.repeat(16)}1`), accessToken);
		expect(response).toHaveStatusCode(400);
	});
});

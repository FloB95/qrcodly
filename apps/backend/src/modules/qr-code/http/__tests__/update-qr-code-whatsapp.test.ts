import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import { generateWhatsAppQrCodeDto, getTestContext, QR_CODE_API_PATH } from './utils';
import { resetTestState } from '@/tests/shared/test-context';

describe('updateQrCode - WhatsApp Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const createQrCode = async (dto: object, token: string) => {
		const response = await testServer.inject({
			method: 'POST',
			url: QR_CODE_API_PATH,
			payload: dto,
			headers: { Authorization: `Bearer ${token}` },
		});
		return JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
	};

	const updateQrCodeRequest = async (id: string, payload: TUpdateQrCodeDto, token: string) =>
		testServer.inject({
			method: 'PATCH',
			url: `${QR_CODE_API_PATH}/${id}`,
			payload,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

	it('should update phone number and message', async () => {
		const createdQrCode = await createQrCode(generateWhatsAppQrCodeDto(), accessToken);
		const newData = { phone: '+44 7700 900123', message: 'Hi, is this still available?' };

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{ content: { type: 'whatsapp', data: newData } },
			accessToken,
		);

		expect(response).toHaveStatusCode(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.content.type).toBe('whatsapp');
		if (updatedQrCode.content.type === 'whatsapp') {
			expect(updatedQrCode.content.data.phone).toBe(newData.phone);
			expect(updatedQrCode.content.data.message).toBe(newData.message);
		}
		expect(updatedQrCode.qrCodeData).toBe(
			'https://wa.me/447700900123?text=Hi%2C%20is%20this%20still%20available%3F',
		);
		expect(updatedQrCode.shortUrl).toBeNull();
	});

	it('should drop the text parameter when the message is removed', async () => {
		const createdQrCode = await createQrCode(generateWhatsAppQrCodeDto(), accessToken);

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{ content: { type: 'whatsapp', data: { phone: '+49 170 1234567' } } },
			accessToken,
		);

		expect(response).toHaveStatusCode(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.qrCodeData).toBe('https://wa.me/491701234567');
	});

	it('should update WhatsApp content together with name and config', async () => {
		const createdQrCode = await createQrCode(generateWhatsAppQrCodeDto(), accessToken);
		const newName = 'WhatsApp Support';
		const newConfig = { ...createdQrCode.config, width: 350 };

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				name: newName,
				config: newConfig,
				content: { type: 'whatsapp', data: { phone: '+1 (555) 123-4567', message: 'Hi' } },
			},
			accessToken,
		);

		expect(response).toHaveStatusCode(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.name).toBe(newName);
		expect(updatedQrCode.config.width).toBe(350);
		expect(updatedQrCode.qrCodeData).toBe('https://wa.me/15551234567?text=Hi');
	});

	describe('Validation', () => {
		it('should reject a phone number without a leading + and country code', async () => {
			const createdQrCode = await createQrCode(generateWhatsAppQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ content: { type: 'whatsapp', data: { phone: '0170 1234567', message: 'Hi' } } },
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject a message exceeding max length (500 chars)', async () => {
			const createdQrCode = await createQrCode(generateWhatsAppQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'whatsapp',
						data: { phone: '+49 170 1234567', message: 'a'.repeat(501) },
					},
				},
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject an empty phone number', async () => {
			const createdQrCode = await createQrCode(generateWhatsAppQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ content: { type: 'whatsapp', data: { phone: '', message: 'Hi' } } },
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});
	});
});

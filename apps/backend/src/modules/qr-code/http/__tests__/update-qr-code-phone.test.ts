import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import { generatePhoneQrCodeDto, getTestContext, QR_CODE_API_PATH } from './utils';
import { resetTestState } from '@/tests/shared/test-context';

describe('updateQrCode - Phone Content Type', () => {
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

	it('should update the phone number and the tel: payload', async () => {
		const createdQrCode = await createQrCode(generatePhoneQrCodeDto(), accessToken);

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{ content: { type: 'phone', data: { phone: '+43 (1) 234-5678' } } },
			accessToken,
		);

		expect(response).toHaveStatusCode(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.content.type).toBe('phone');
		if (updatedQrCode.content.type === 'phone') {
			expect(updatedQrCode.content.data.phone).toBe('+43 (1) 234-5678');
		}
		expect(updatedQrCode.qrCodeData).toBe('tel:+4312345678');
		expect(updatedQrCode.shortUrl).toBeNull();
	});

	it('should update phone content together with name and config', async () => {
		const createdQrCode = await createQrCode(generatePhoneQrCodeDto(), accessToken);
		const newName = 'Support Hotline';
		const newConfig = { ...createdQrCode.config, width: 350 };

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				name: newName,
				config: newConfig,
				content: { type: 'phone', data: { phone: '0800 123456' } },
			},
			accessToken,
		);

		expect(response).toHaveStatusCode(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.name).toBe(newName);
		expect(updatedQrCode.config.width).toBe(350);
		expect(updatedQrCode.qrCodeData).toBe('tel:0800123456');
	});

	it('should reject changing the content type of a phone QR code', async () => {
		const createdQrCode = await createQrCode(generatePhoneQrCodeDto(), accessToken);

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{ content: { type: 'sms', data: { phone: '+49 170 1234567', message: 'Hi' } } },
			accessToken,
		);

		expect(response).toHaveStatusCode(400);
	});

	describe('Validation', () => {
		it('should reject an empty phone number', async () => {
			const createdQrCode = await createQrCode(generatePhoneQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ content: { type: 'phone', data: { phone: '' } } },
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject letters in the phone number', async () => {
			const createdQrCode = await createQrCode(generatePhoneQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ content: { type: 'phone', data: { phone: '+49 abc' } } },
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject a phone number with fewer than 3 digits', async () => {
			const createdQrCode = await createQrCode(generatePhoneQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ content: { type: 'phone', data: { phone: '+1' } } },
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});
	});
});

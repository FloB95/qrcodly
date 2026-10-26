import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import { generateSmsQrCodeDto, getTestContext, QR_CODE_API_PATH } from './utils';
import { resetTestState } from '@/tests/shared/test-context';

describe('updateQrCode - SMS Content Type', () => {
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
		const createdQrCode = await createQrCode(generateSmsQrCodeDto(), accessToken);
		const newSmsData = { phone: '+49 (170) 987-6543', message: 'Please call me back' };

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{ content: { type: 'sms', data: newSmsData } },
			accessToken,
		);

		expect(response).toHaveStatusCode(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.content.type).toBe('sms');
		if (updatedQrCode.content.type === 'sms') {
			expect(updatedQrCode.content.data.phone).toBe(newSmsData.phone);
			expect(updatedQrCode.content.data.message).toBe(newSmsData.message);
		}
		expect(updatedQrCode.qrCodeData).toBe('SMSTO:+491709876543:Please call me back');
		expect(updatedQrCode.shortUrl).toBeNull();
	});

	it('should remove the message when it is omitted', async () => {
		const createdQrCode = await createQrCode(generateSmsQrCodeDto(), accessToken);

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{ content: { type: 'sms', data: { phone: '+49 170 1234567' } } },
			accessToken,
		);

		expect(response).toHaveStatusCode(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		if (updatedQrCode.content.type === 'sms') {
			expect(updatedQrCode.content.data.message).toBeUndefined();
		}
		expect(updatedQrCode.qrCodeData).toBe('SMSTO:+491701234567:');
	});

	it('should update SMS content together with name and config', async () => {
		const createdQrCode = await createQrCode(generateSmsQrCodeDto(), accessToken);
		const newName = 'Callback SMS';
		const newConfig = { ...createdQrCode.config, width: 350 };

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				name: newName,
				config: newConfig,
				content: { type: 'sms', data: { phone: '0170 1234567', message: 'Hi' } },
			},
			accessToken,
		);

		expect(response).toHaveStatusCode(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.name).toBe(newName);
		expect(updatedQrCode.config.width).toBe(350);
		expect(updatedQrCode.qrCodeData).toBe('SMSTO:01701234567:Hi');
	});

	describe('Validation', () => {
		it('should reject a message exceeding max length (500 chars)', async () => {
			const createdQrCode = await createQrCode(generateSmsQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ content: { type: 'sms', data: { phone: '+49 170 1234567', message: 'a'.repeat(501) } } },
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject an invalid phone number', async () => {
			const createdQrCode = await createQrCode(generateSmsQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ content: { type: 'sms', data: { phone: 'not a number', message: 'Hi' } } },
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject an empty phone number', async () => {
			const createdQrCode = await createQrCode(generateSmsQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ content: { type: 'sms', data: { phone: '', message: 'Hi' } } },
				accessToken,
			);

			expect(response).toHaveStatusCode(400);
		});
	});
});

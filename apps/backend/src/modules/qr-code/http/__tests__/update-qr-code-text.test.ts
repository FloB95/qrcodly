import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import { generateTextQrCodeDto, getTestContext, QR_CODE_API_PATH } from './utils';

describe('updateQrCode - Text Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
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

	it('should update text content', async () => {
		const createdQrCode = await createQrCode(generateTextQrCodeDto(), accessToken);
		const newText = 'This is the updated text content for the QR code.';

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'text',
					data: newText,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.content.type).toBe('text');
		if (updatedQrCode.content.type === 'text') {
			expect(updatedQrCode.content.data).toBe(newText);
		}

		// Verify qrCodeData is updated to the new text
		expect(updatedQrCode.qrCodeData).toBe(newText);
	});

	it('should update text content with name', async () => {
		const createdQrCode = await createQrCode(generateTextQrCodeDto(), accessToken);
		const newText = 'Another text update';
		const newName = 'Text QR Updated';

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				name: newName,
				content: {
					type: 'text',
					data: newText,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.name).toBe(newName);
		if (updatedQrCode.content.type === 'text') {
			expect(updatedQrCode.content.data).toBe(newText);
		}

		// Verify qrCodeData is updated
		expect(updatedQrCode.qrCodeData).toBe(newText);
	});

	it('should update text with config changes', async () => {
		const createdQrCode = await createQrCode(generateTextQrCodeDto(), accessToken);
		const newText = 'Text with new config';
		const newConfig = { ...createdQrCode.config, width: 400 };

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				config: newConfig,
				content: {
					type: 'text',
					data: newText,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.config.width).toBe(400);
		expect(updatedQrCode.qrCodeData).toBe(newText);
	});

	it('should update text with all fields (name, config, content)', async () => {
		const createdQrCode = await createQrCode(generateTextQrCodeDto(), accessToken);
		const newText = 'Complete update text';
		const newName = 'Complete Text Update';
		const newConfig = { ...createdQrCode.config, width: 550, height: 550 };

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				name: newName,
				config: newConfig,
				content: {
					type: 'text',
					data: newText,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.name).toBe(newName);
		expect(updatedQrCode.config.width).toBe(550);
		expect(updatedQrCode.config.height).toBe(550);
		expect(updatedQrCode.qrCodeData).toBe(newText);
	});

	it('should handle special characters in text', async () => {
		const createdQrCode = await createQrCode(generateTextQrCodeDto(), accessToken);
		const newText = 'Special chars: äöü ñ 中文 🚀 @#$%^&*()';

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'text',
					data: newText,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		if (updatedQrCode.content.type === 'text') {
			expect(updatedQrCode.content.data).toBe(newText);
		}
		expect(updatedQrCode.qrCodeData).toBe(newText);
	});

	it('should handle multiline text', async () => {
		const createdQrCode = await createQrCode(generateTextQrCodeDto(), accessToken);
		const newText = 'Line 1\nLine 2\nLine 3';

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'text',
					data: newText,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.qrCodeData).toBe(newText);
	});

	describe('Validation', () => {
		it('should reject empty text', async () => {
			const createdQrCode = await createQrCode(generateTextQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'text',
						data: '',
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject text exceeding max length (2000 chars)', async () => {
			const createdQrCode = await createQrCode(generateTextQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'text',
						data: 'a'.repeat(2001),
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});
	});
});

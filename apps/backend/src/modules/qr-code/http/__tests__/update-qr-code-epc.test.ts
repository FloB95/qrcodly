import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import { generateEpcQrCodeDto, getTestContext, QR_CODE_API_PATH } from './utils';

describe('updateQrCode - EPC Content Type', () => {
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

	it('should update EPC beneficiary details', async () => {
		const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);
		const newEpcData = {
			name: 'Updated Company GmbH',
			iban: 'DE89370400440532013000',
			bic: 'DEUTDEFFXXX',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'epc',
					data: newEpcData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.content.type).toBe('epc');
		if (updatedQrCode.content.type === 'epc') {
			expect(updatedQrCode.content.data.name).toBe(newEpcData.name);
			expect(updatedQrCode.content.data.bic).toBe(newEpcData.bic);
		}

		// Verify qrCodeData is updated
		expect(updatedQrCode.qrCodeData).toContain(newEpcData.name);
		expect(updatedQrCode.qrCodeData).toContain(newEpcData.bic);
	});

	it('should update EPC with name and config', async () => {
		const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);
		const newName = 'Payment QR Code';
		const newConfig = { ...createdQrCode.config, width: 350 };
		const newEpcData = {
			name: 'New Beneficiary',
			iban: 'FR7630006000011234567890189',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				name: newName,
				config: newConfig,
				content: {
					type: 'epc',
					data: newEpcData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.name).toBe(newName);
		expect(updatedQrCode.config.width).toBe(350);
		if (updatedQrCode.content.type === 'epc') {
			expect(updatedQrCode.content.data.name).toBe(newEpcData.name);
		}
	});

	it('should update EPC amount', async () => {
		const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);
		const newEpcData = {
			name: 'Invoice Payment',
			iban: 'DE89370400440532013000',
			amount: 299.99,
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'epc',
					data: newEpcData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

		// Verify qrCodeData includes the amount
		expect(updatedQrCode.qrCodeData).toContain('EUR299.99');
	});

	it('should update EPC purpose', async () => {
		const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);
		const newEpcData = {
			name: 'Service Provider',
			iban: 'DE89370400440532013000',
			purpose: 'January subscription',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'epc',
					data: newEpcData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

		expect(updatedQrCode.qrCodeData).toContain(newEpcData.purpose);
	});

	it('should handle different IBAN formats', async () => {
		const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);
		const newEpcData = {
			name: 'French Company',
			iban: 'FR7630006000011234567890189',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'epc',
					data: newEpcData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		if (updatedQrCode.content.type === 'epc') {
			expect(updatedQrCode.content.data.iban).toBe(newEpcData.iban);
		}
	});

	describe('Validation', () => {
		it('should reject empty beneficiary name', async () => {
			const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'epc',
						data: {
							name: '',
							iban: 'DE89370400440532013000',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject beneficiary name exceeding max length (70 chars)', async () => {
			const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'epc',
						data: {
							name: 'a'.repeat(71),
							iban: 'DE89370400440532013000',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject invalid IBAN format', async () => {
			const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'epc',
						data: {
							name: 'Test User',
							iban: 'INVALID-IBAN',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject invalid BIC format', async () => {
			const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'epc',
						data: {
							name: 'Test User',
							iban: 'DE89370400440532013000',
							bic: 'INVALID',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject amount below minimum', async () => {
			const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'epc',
						data: {
							name: 'Test User',
							iban: 'DE89370400440532013000',
							amount: 0,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject amount exceeding maximum', async () => {
			const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'epc',
						data: {
							name: 'Test User',
							iban: 'DE89370400440532013000',
							amount: 1000000000,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject purpose exceeding max length (140 chars)', async () => {
			const createdQrCode = await createQrCode(generateEpcQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'epc',
						data: {
							name: 'Test User',
							iban: 'DE89370400440532013000',
							purpose: 'a'.repeat(141),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});
	});
});

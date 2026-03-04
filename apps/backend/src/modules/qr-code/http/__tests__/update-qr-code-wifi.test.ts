import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import { generateWifiQrCodeDto, getTestContext, QR_CODE_API_PATH } from './utils';

describe('updateQrCode - WiFi Content Type', () => {
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

	it('should update WiFi credentials', async () => {
		const createdQrCode = await createQrCode(generateWifiQrCodeDto(), accessToken);
		const newWifiData = {
			ssid: 'NewNetwork2026',
			password: 'SuperSecurePassword123!',
			encryption: 'WPA' as const,
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'wifi',
					data: newWifiData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.content.type).toBe('wifi');
		if (updatedQrCode.content.type === 'wifi') {
			expect(updatedQrCode.content.data.ssid).toBe(newWifiData.ssid);
			expect(updatedQrCode.content.data.password).toBe(newWifiData.password);
			expect(updatedQrCode.content.data.encryption).toBe(newWifiData.encryption);
		}

		// Verify qrCodeData is updated to the new WiFi string
		expect(updatedQrCode.qrCodeData).toBe(
			`WIFI:T:${newWifiData.encryption};S:${newWifiData.ssid};P:${newWifiData.password};;`,
		);
	});

	it('should update WiFi with name and config', async () => {
		const createdQrCode = await createQrCode(generateWifiQrCodeDto(), accessToken);
		const newName = 'Office WiFi QR';
		const newConfig = { ...createdQrCode.config, width: 350 };
		const newWifiData = {
			ssid: 'OfficeNetwork',
			password: 'office2026',
			encryption: 'WPA' as const,
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				name: newName,
				config: newConfig,
				content: {
					type: 'wifi',
					data: newWifiData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.name).toBe(newName);
		expect(updatedQrCode.config.width).toBe(350);
		if (updatedQrCode.content.type === 'wifi') {
			expect(updatedQrCode.content.data.ssid).toBe(newWifiData.ssid);
		}

		// Verify qrCodeData
		expect(updatedQrCode.qrCodeData).toBe(
			`WIFI:T:${newWifiData.encryption};S:${newWifiData.ssid};P:${newWifiData.password};;`,
		);
	});

	it('should update WiFi with WEP encryption', async () => {
		const createdQrCode = await createQrCode(generateWifiQrCodeDto(), accessToken);
		const newWifiData = {
			ssid: 'LegacyNetwork',
			password: 'wep12345',
			encryption: 'WEP' as const,
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'wifi',
					data: newWifiData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

		// Verify qrCodeData uses WEP encryption
		expect(updatedQrCode.qrCodeData).toBe(
			`WIFI:T:${newWifiData.encryption};S:${newWifiData.ssid};P:${newWifiData.password};;`,
		);
	});

	it('should update WiFi with no encryption (open network)', async () => {
		const createdQrCode = await createQrCode(generateWifiQrCodeDto(), accessToken);
		const newWifiData = {
			ssid: 'OpenNetwork',
			password: '',
			encryption: 'nopass' as const,
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'wifi',
					data: newWifiData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

		// Verify qrCodeData for open network
		expect(updatedQrCode.qrCodeData).toBe(`WIFI:T:nopass;S:${newWifiData.ssid};P:;;`);
	});

	it('should handle special characters in SSID and password', async () => {
		const createdQrCode = await createQrCode(generateWifiQrCodeDto(), accessToken);
		const newWifiData = {
			ssid: 'My Network: Test',
			password: 'P@ss;word:123',
			encryption: 'WPA' as const,
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'wifi',
					data: newWifiData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		if (updatedQrCode.content.type === 'wifi') {
			expect(updatedQrCode.content.data.ssid).toBe(newWifiData.ssid);
			expect(updatedQrCode.content.data.password).toBe(newWifiData.password);
		}
	});

	describe('Validation', () => {
		it('should reject empty SSID', async () => {
			const createdQrCode = await createQrCode(generateWifiQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'wifi',
						data: {
							ssid: '',
							password: 'somepassword',
							encryption: 'WPA' as const,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject SSID exceeding max length (64 chars)', async () => {
			const createdQrCode = await createQrCode(generateWifiQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'wifi',
						data: {
							ssid: 'a'.repeat(65),
							password: 'somepassword',
							encryption: 'WPA' as const,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject password exceeding max length (64 chars)', async () => {
			const createdQrCode = await createQrCode(generateWifiQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'wifi',
						data: {
							ssid: 'TestNetwork',
							password: 'a'.repeat(65),
							encryption: 'WPA' as const,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject invalid encryption type', async () => {
			const createdQrCode = await createQrCode(generateWifiQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'wifi',
						data: {
							ssid: 'TestNetwork',
							password: 'somepassword',
							encryption: 'INVALID' as any,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});
	});
});

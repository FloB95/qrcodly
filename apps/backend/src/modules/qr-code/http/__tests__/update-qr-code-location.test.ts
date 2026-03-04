import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import { generateLocationQrCodeDto, getTestContext, QR_CODE_API_PATH } from './utils';

describe('updateQrCode - Location Content Type', () => {
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

	it('should update location coordinates', async () => {
		const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);
		const newLocationData = {
			latitude: 40.7128,
			longitude: -74.006,
			address: '123 Main St, New York, NY',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'location',
					data: newLocationData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.content.type).toBe('location');
		if (updatedQrCode.content.type === 'location') {
			expect(updatedQrCode.content.data.latitude).toBe(newLocationData.latitude);
			expect(updatedQrCode.content.data.longitude).toBe(newLocationData.longitude);
			expect(updatedQrCode.content.data.address).toBe(newLocationData.address);
		}

		// Verify qrCodeData contains geo format
		const expectedGeo = `geo:${newLocationData.latitude},${newLocationData.longitude}?q=${encodeURIComponent(newLocationData.address)}`;
		expect(updatedQrCode.qrCodeData).toBe(expectedGeo);
	});

	it('should update location with all fields (name, config, content)', async () => {
		const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);
		const newName = 'Office Location QR';
		const newConfig = { ...createdQrCode.config, width: 380 };
		const newLocationData = {
			latitude: 51.5074,
			longitude: -0.1278,
			address: 'London, UK',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				name: newName,
				config: newConfig,
				content: {
					type: 'location',
					data: newLocationData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(updatedQrCode.name).toBe(newName);
		expect(updatedQrCode.config.width).toBe(380);
		if (updatedQrCode.content.type === 'location') {
			expect(updatedQrCode.content.data.latitude).toBe(newLocationData.latitude);
		}

		// Verify qrCodeData
		const expectedGeo = `geo:${newLocationData.latitude},${newLocationData.longitude}?q=${encodeURIComponent(newLocationData.address)}`;
		expect(updatedQrCode.qrCodeData).toBe(expectedGeo);
	});

	it('should update location to address-only (no coordinates)', async () => {
		const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);
		const newLocationData = {
			address: '456 Broadway, New York, NY',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'location',
					data: newLocationData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

		// Verify qrCodeData contains Google Maps URL for address-only
		const expectedUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(newLocationData.address)}`;
		expect(updatedQrCode.qrCodeData).toBe(expectedUrl);
	});

	it('should update location with boundary coordinates', async () => {
		const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);
		const newLocationData = {
			latitude: 90, // Max latitude
			longitude: 180, // Max longitude
			address: 'North Pole Area',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'location',
					data: newLocationData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		if (updatedQrCode.content.type === 'location') {
			expect(updatedQrCode.content.data.latitude).toBe(90);
			expect(updatedQrCode.content.data.longitude).toBe(180);
		}
	});

	it('should update location with negative coordinates', async () => {
		const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);
		const newLocationData = {
			latitude: -33.8688,
			longitude: 151.2093,
			address: 'Sydney, Australia',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				content: {
					type: 'location',
					data: newLocationData,
				},
			},
			accessToken,
		);

		expect(response.statusCode).toBe(200);
		const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		if (updatedQrCode.content.type === 'location') {
			expect(updatedQrCode.content.data.latitude).toBe(newLocationData.latitude);
			expect(updatedQrCode.content.data.longitude).toBe(newLocationData.longitude);
		}

		// Verify qrCodeData handles negative coordinates
		const expectedGeo = `geo:${newLocationData.latitude},${newLocationData.longitude}?q=${encodeURIComponent(newLocationData.address)}`;
		expect(updatedQrCode.qrCodeData).toBe(expectedGeo);
	});

	describe('Validation', () => {
		it('should reject latitude above maximum (90)', async () => {
			const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'location',
						data: {
							latitude: 100,
							longitude: 0,
							address: 'Test Address',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject latitude below minimum (-90)', async () => {
			const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'location',
						data: {
							latitude: -91,
							longitude: 0,
							address: 'Test Address',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject longitude above maximum (180)', async () => {
			const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'location',
						data: {
							latitude: 0,
							longitude: 200,
							address: 'Test Address',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject longitude below minimum (-180)', async () => {
			const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'location',
						data: {
							latitude: 0,
							longitude: -181,
							address: 'Test Address',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject empty address', async () => {
			const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'location',
						data: {
							latitude: 0,
							longitude: 0,
							address: '',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject address exceeding max length (200 chars)', async () => {
			const createdQrCode = await createQrCode(generateLocationQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'location',
						data: {
							latitude: 0,
							longitude: 0,
							address: 'a'.repeat(201),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});
	});
});

import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import {
	generateLocationQrCodeDto,
	getTestContext,
	releaseTestContext,
	createQrCodeRequest,
} from './utils';

describe('createQrCode - Location Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	afterAll(async () => {
		await releaseTestContext();
	});

	const createRequest = async (payload?: TCreateQrCodeDto, token?: string) =>
		createQrCodeRequest(testServer, payload, token);

	it('should create a location QR code', async () => {
		const createQrCodeDto = generateLocationQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('location');
		if (receivedQrCode.content.type === 'location' && createQrCodeDto.content.type === 'location') {
			expect(receivedQrCode.content.data.latitude).toBe(createQrCodeDto.content.data.latitude);
			expect(receivedQrCode.content.data.longitude).toBe(createQrCodeDto.content.data.longitude);
			expect(receivedQrCode.content.data.address).toBe(createQrCodeDto.content.data.address);
		}
		expect(receivedQrCode.shortUrl).toBeNull();

		// Verify qrCodeData contains geo format for location with coordinates
		if (createQrCodeDto.content.type === 'location') {
			const { latitude, longitude, address } = createQrCodeDto.content.data;
			const expectedGeo = `geo:${latitude},${longitude}?q=${encodeURIComponent(address)}`;
			expect(receivedQrCode.qrCodeData).toBe(expectedGeo);
		}
	});

	it('should validate latitude range (-90 to 90) - above max', async () => {
		const invalidLatDto = {
			...generateLocationQrCodeDto(),
			content: {
				type: 'location' as const,
				data: {
					latitude: 100,
					longitude: 0,
					address: 'Test Address',
				},
			},
		};
		const response = await createRequest(invalidLatDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should validate longitude range (-180 to 180) - above max', async () => {
		const invalidLngDto = {
			...generateLocationQrCodeDto(),
			content: {
				type: 'location' as const,
				data: {
					latitude: 0,
					longitude: 200,
					address: 'Test Address',
				},
			},
		};
		const response = await createRequest(invalidLngDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject latitude below minimum (-90)', async () => {
		const invalidLatDto = {
			...generateLocationQrCodeDto(),
			content: {
				type: 'location' as const,
				data: {
					latitude: -91,
					longitude: 0,
					address: 'Test Address',
				},
			},
		};
		const response = await createRequest(invalidLatDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject longitude below minimum (-180)', async () => {
		const invalidLngDto = {
			...generateLocationQrCodeDto(),
			content: {
				type: 'location' as const,
				data: {
					latitude: 0,
					longitude: -181,
					address: 'Test Address',
				},
			},
		};
		const response = await createRequest(invalidLngDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject empty address', async () => {
		const invalidAddressDto = {
			...generateLocationQrCodeDto(),
			content: {
				type: 'location' as const,
				data: {
					latitude: 0,
					longitude: 0,
					address: '',
				},
			},
		};
		const response = await createRequest(invalidAddressDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject address exceeding max length (200 chars)', async () => {
		const invalidAddressDto = {
			...generateLocationQrCodeDto(),
			content: {
				type: 'location' as const,
				data: {
					latitude: 0,
					longitude: 0,
					address: 'a'.repeat(201),
				},
			},
		};
		const response = await createRequest(invalidAddressDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should create location QR code without coordinates (address only)', async () => {
		const addressOnlyDto: TCreateQrCodeDto = {
			...generateLocationQrCodeDto(),
			content: {
				type: 'location' as const,
				data: {
					address: '123 Main St, City, Country',
				},
			},
		};
		const response = await createRequest(addressOnlyDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		// Verify qrCodeData contains Google Maps URL for address-only location
		const expectedUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('123 Main St, City, Country')}`;
		expect(receivedQrCode.qrCodeData).toBe(expectedUrl);
	});
});

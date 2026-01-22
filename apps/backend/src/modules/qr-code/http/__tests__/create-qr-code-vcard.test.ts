import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import {
	generateVCardQrCodeDto,
	generateDynamicVCardQrCodeDto,
	getTestContext,
	createQrCodeRequest,
} from './utils';

describe('createQrCode - vCard Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const createRequest = async (payload?: TCreateQrCodeDto, token?: string) =>
		createQrCodeRequest(testServer, payload, token);

	it('should create a static vCard QR code (isDynamic: false)', async () => {
		const createQrCodeDto = generateVCardQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('vCard');
		if (receivedQrCode.content.type === 'vCard' && createQrCodeDto.content.type === 'vCard') {
			expect(receivedQrCode.content.data.firstName).toBe(createQrCodeDto.content.data.firstName);
			expect(receivedQrCode.content.data.lastName).toBe(createQrCodeDto.content.data.lastName);
			expect(receivedQrCode.content.data.email).toBe(createQrCodeDto.content.data.email);
			expect(receivedQrCode.content.data.phone).toBe(createQrCodeDto.content.data.phone);
			expect(receivedQrCode.content.data.company).toBe(createQrCodeDto.content.data.company);
			expect(receivedQrCode.content.data.isDynamic).toBeUndefined();
		}
		expect(receivedQrCode.shortUrl).toBeNull();

		// Verify qrCodeData contains VCF format for static vCard
		expect(receivedQrCode.qrCodeData).toContain('BEGIN:VCARD');
		expect(receivedQrCode.qrCodeData).toContain('VERSION:3.0');
		expect(receivedQrCode.qrCodeData).toContain('END:VCARD');
		if (createQrCodeDto.content.type === 'vCard') {
			// Verify name field is included (N:{lastName};{firstName})
			expect(receivedQrCode.qrCodeData).toContain(
				`N:${createQrCodeDto.content.data.lastName};${createQrCodeDto.content.data.firstName}`,
			);
		}
	});

	it('should create a dynamic vCard QR code (isDynamic: true)', async () => {
		const createQrCodeDto = generateDynamicVCardQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('vCard');
		if (receivedQrCode.content.type === 'vCard') {
			expect(receivedQrCode.content.data.isDynamic).toBe(true);
		}
		expect(receivedQrCode.shortUrl).toBeDefined();
		expect(receivedQrCode.shortUrl?.shortCode).toEqual(expect.any(String));
		expect(receivedQrCode.shortUrl?.destinationUrl).toContain(receivedQrCode.id);
		expect(receivedQrCode.shortUrl?.isActive).toBe(true);

		// Verify qrCodeData contains the short URL for dynamic vCard
		expect(receivedQrCode.qrCodeData).toContain('/u/');
		expect(receivedQrCode.qrCodeData).toContain(receivedQrCode.shortUrl?.shortCode);
	});

	it('should validate email format in vCard', async () => {
		const invalidEmailDto = {
			...generateVCardQrCodeDto(),
			content: {
				type: 'vCard' as const,
				data: {
					firstName: 'John',
					lastName: 'Doe',
					email: 'invalid-email',
				},
			},
		};
		const response = await createRequest(invalidEmailDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject vCard with no fields provided', async () => {
		const emptyVCardDto = {
			...generateVCardQrCodeDto(),
			content: {
				type: 'vCard' as const,
				data: {},
			},
		};
		const response = await createRequest(emptyVCardDto, accessToken);
		expect(response.statusCode).toBe(400);

		const error = JSON.parse(response.payload);
		expect(error.message).toContain('At least one vCard field must be provided');
	});

	it('should reject vCard with only isDynamic field (no contact data)', async () => {
		const invalidVCardDto = {
			...generateVCardQrCodeDto(),
			content: {
				type: 'vCard' as const,
				data: {
					isDynamic: true,
				},
			},
		};
		const response = await createRequest(invalidVCardDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject invalid phone format in vCard', async () => {
		const invalidPhoneDto = {
			...generateVCardQrCodeDto(),
			content: {
				type: 'vCard' as const,
				data: {
					firstName: 'John',
					phone: 'not-a-phone-number',
				},
			},
		};
		const response = await createRequest(invalidPhoneDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject firstName exceeding max length (64 chars)', async () => {
		const invalidVCardDto = {
			...generateVCardQrCodeDto(),
			content: {
				type: 'vCard' as const,
				data: {
					firstName: 'a'.repeat(65),
				},
			},
		};
		const response = await createRequest(invalidVCardDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject invalid website URL in vCard', async () => {
		const invalidWebsiteDto = {
			...generateVCardQrCodeDto(),
			content: {
				type: 'vCard' as const,
				data: {
					firstName: 'John',
					website: 'not-a-valid-url',
				},
			},
		};
		const response = await createRequest(invalidWebsiteDto, accessToken);
		expect(response.statusCode).toBe(400);
	});
});

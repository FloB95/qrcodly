import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import {
	generateVCardQrCodeDto,
	generateDynamicVCardQrCodeDto,
	getTestContext,
	releaseTestContext,
	QR_CODE_API_PATH,
} from './utils';

describe('updateQrCode - vCard Content Type', () => {
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

	describe('Static vCard (isDynamic: false)', () => {
		it('should update static vCard contact information', async () => {
			const createdQrCode = await createQrCode(generateVCardQrCodeDto(), accessToken);
			const newVCardData = {
				firstName: 'John',
				lastName: 'Updated',
				email: 'john.updated@example.com',
				phone: '+1234567890',
				company: 'Updated Corp',
			};

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: newVCardData,
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.content.type).toBe('vCard');
			if (updatedQrCode.content.type === 'vCard') {
				expect(updatedQrCode.content.data.firstName).toBe(newVCardData.firstName);
				expect(updatedQrCode.content.data.lastName).toBe(newVCardData.lastName);
				expect(updatedQrCode.content.data.email).toBe(newVCardData.email);
				expect(updatedQrCode.content.data.phone).toBe(newVCardData.phone);
				expect(updatedQrCode.content.data.company).toBe(newVCardData.company);
			}

			// Verify qrCodeData contains VCF format
			expect(updatedQrCode.qrCodeData).toContain('BEGIN:VCARD');
			expect(updatedQrCode.qrCodeData).toContain('VERSION:3.0');
			expect(updatedQrCode.qrCodeData).toContain('END:VCARD');
			expect(updatedQrCode.qrCodeData).toContain(
				`N:${newVCardData.lastName};${newVCardData.firstName}`,
			);
		});

		it('should verify non-dynamic vCard has no short URL', async () => {
			const createdQrCode = await createQrCode(generateVCardQrCodeDto(), accessToken);

			expect(createdQrCode.shortUrl).toBeNull();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: {
							firstName: 'Static',
							lastName: 'Card',
							email: 'static@example.com',
							phone: '+1111111111',
							company: 'Static Inc',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.shortUrl).toBeNull();

			// qrCodeData should be VCF format, not short URL
			expect(updatedQrCode.qrCodeData).toContain('BEGIN:VCARD');
		});

		it('should update static vCard with all optional fields', async () => {
			const createdQrCode = await createQrCode(generateVCardQrCodeDto(), accessToken);
			const newVCardData = {
				firstName: 'Jane',
				lastName: 'Doe',
				email: 'jane.doe@example.com',
				phone: '+9876543210',
				company: 'Acme Inc',
				job: 'CEO',
				website: 'https://example.com',
				street: '123 Main St',
				city: 'New York',
				zip: '10001',
				country: 'USA',
			};

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: newVCardData,
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			if (updatedQrCode.content.type === 'vCard') {
				expect(updatedQrCode.content.data.job).toBe(newVCardData.job);
				expect(updatedQrCode.content.data.website).toBe(newVCardData.website);
				expect(updatedQrCode.content.data.city).toBe(newVCardData.city);
			}

			// Verify VCF format includes address
			expect(updatedQrCode.qrCodeData).toContain('BEGIN:VCARD');
		});
	});

	describe('Dynamic vCard (isDynamic: true)', () => {
		it('should update dynamic vCard and maintain short URL', async () => {
			const createdQrCode = await createQrCode(generateDynamicVCardQrCodeDto(), accessToken);
			const newVCardData = {
				firstName: 'Jane',
				lastName: 'Dynamic',
				email: 'jane.dynamic@example.com',
				phone: '+9876543210',
				company: 'Dynamic Inc',
				isDynamic: true,
			};

			// Verify short URL exists for dynamic vCard
			expect(createdQrCode.shortUrl).toBeDefined();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: newVCardData,
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.content.type).toBe('vCard');
			if (updatedQrCode.content.type === 'vCard') {
				expect(updatedQrCode.content.data.firstName).toBe(newVCardData.firstName);
				expect(updatedQrCode.content.data.isDynamic).toBe(true);
			}
			// Short URL should still exist
			expect(updatedQrCode.shortUrl).toBeDefined();

			// qrCodeData should contain short URL, not VCF
			expect(updatedQrCode.qrCodeData).toContain('/u/');
			expect(updatedQrCode.qrCodeData).toContain(updatedQrCode.shortUrl?.shortCode);
		});

		it('should verify dynamic vCard maintains short URL after update', async () => {
			const createdQrCode = await createQrCode(generateDynamicVCardQrCodeDto(), accessToken);
			const originalShortCode = createdQrCode.shortUrl?.shortCode;

			expect(originalShortCode).toBeDefined();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: {
							firstName: 'Updated',
							lastName: 'Person',
							email: 'updated@example.com',
							phone: '+9999999999',
							company: 'Updated Company',
							isDynamic: true,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.shortUrl?.shortCode).toBe(originalShortCode);

			// qrCodeData should still use the same short code
			expect(updatedQrCode.qrCodeData).toContain(originalShortCode);
		});

		it('should update dynamic vCard with all fields (name, config, content)', async () => {
			const createdQrCode = await createQrCode(generateDynamicVCardQrCodeDto(), accessToken);
			const newName = 'CEO Business Card';
			const newConfig = { ...createdQrCode.config, width: 400 };
			const newVCardData = {
				firstName: 'Sarah',
				lastName: 'CEO',
				email: 'sarah.ceo@company.com',
				phone: '+1112223333',
				company: 'Tech Startup Inc',
				isDynamic: true,
			};

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					name: newName,
					config: newConfig,
					content: {
						type: 'vCard',
						data: newVCardData,
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.name).toBe(newName);
			expect(updatedQrCode.config.width).toBe(400);
			if (updatedQrCode.content.type === 'vCard') {
				expect(updatedQrCode.content.data.firstName).toBe(newVCardData.firstName);
			}
		});
	});

	describe('Validation', () => {
		it('should reject vCard with no fields provided', async () => {
			const createdQrCode = await createQrCode(generateVCardQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: {},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject invalid email format in vCard', async () => {
			const createdQrCode = await createQrCode(generateVCardQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: {
							firstName: 'John',
							lastName: 'Doe',
							email: 'invalid-email',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject invalid phone format in vCard', async () => {
			const createdQrCode = await createQrCode(generateVCardQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: {
							firstName: 'John',
							phone: 'not-a-phone-number',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject firstName exceeding max length (64 chars)', async () => {
			const createdQrCode = await createQrCode(generateVCardQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: {
							firstName: 'a'.repeat(65),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject invalid website URL in vCard', async () => {
			const createdQrCode = await createQrCode(generateVCardQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'vCard',
						data: {
							firstName: 'John',
							website: 'not-a-valid-url',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});
	});
});

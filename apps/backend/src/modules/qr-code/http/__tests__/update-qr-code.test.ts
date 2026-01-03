import { API_BASE_PATH } from '@/core/config/constants';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import type { FastifyInstance } from 'fastify';
import {
	generateQrCodeDto,
	generateEditableUrlQrCodeDto,
	generateEventQrCodeDto,
	generateWifiQrCodeDto,
	generateVCardQrCodeDto,
	generateDynamicVCardQrCodeDto,
	generateEmailQrCodeDto,
	generateLocationQrCodeDto,
	generateTextQrCodeDto,
} from './utils';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

describe('updateQrCode', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

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

	beforeAll(async () => {
		const serverSetup = await getTestServerWithUserAuth();
		testServer = serverSetup.testServer;
		accessToken = serverSetup.accessToken;
		accessToken2 = serverSetup.accessToken2;
	});

	afterAll(async () => {
		// Small delay to ensure all async Redis operations complete
		await new Promise((resolve) => setTimeout(resolve, 100));
		await shutDownServer();
	});

	describe('PATCH /qr-code/:id - Basic Updates', () => {
		it('should update QR code name successfully', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);
			const newName = 'Updated QR Code Name';

			const response = await updateQrCodeRequest(createdQrCode.id, { name: newName }, accessToken);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.name).toBe(newName);
			expect(updatedQrCode.id).toBe(createdQrCode.id);
		});

		it('should update QR code config (width, height, colors)', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			const updatedConfig = {
				...createdQrCode.config,
				width: 500,
				height: 500,
				dotsOptions: {
					...createdQrCode.config.dotsOptions,
					style: {
						type: 'hex' as const,
						value: '#ff0000',
					},
				},
			};

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ config: updatedConfig },
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.config.width).toBe(500);
			expect(updatedQrCode.config.height).toBe(500);
			if (updatedQrCode.config.dotsOptions.style.type === 'hex') {
				expect(updatedQrCode.config.dotsOptions.style.value).toBe('#ff0000');
			}
		});

		it('should update both name and config simultaneously', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);
			const newName = 'Multi-Update Test';
			const updatedConfig = { ...createdQrCode.config, width: 600 };

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					name: newName,
					config: updatedConfig,
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.name).toBe(newName);
			expect(updatedQrCode.config.width).toBe(600);
		});
	});

	describe('PATCH /qr-code/:id - URL Content Type', () => {
		it('should update non-editable URL content', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);
			const newUrl = 'https://updated-example.com';

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: newUrl,
							isEditable: false,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.content.type).toBe('url');
			if (updatedQrCode.content.type === 'url') {
				expect(updatedQrCode.content.data.url).toBe(newUrl);
				expect(updatedQrCode.content.data.isEditable).toBe(false);
			}
		});

		it('should update editable URL content and update linked short URL', async () => {
			const createdQrCode = await createQrCode(generateEditableUrlQrCodeDto(), accessToken);
			const newUrl = 'https://new-destination.com';

			// Verify short URL exists
			expect(createdQrCode.shortUrl).toBeDefined();
			expect(createdQrCode.shortUrl?.destinationUrl).toBeDefined();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: newUrl,
							isEditable: true,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.content.type).toBe('url');
			if (updatedQrCode.content.type === 'url') {
				// For editable URLs, the actual URL is stored in shortUrl.destinationUrl
				expect(updatedQrCode.shortUrl?.destinationUrl).toBe(newUrl);
				expect(updatedQrCode.content.data.isEditable).toBe(true);
			}
		});

		it('should update editable URL with name and config together', async () => {
			const createdQrCode = await createQrCode(generateEditableUrlQrCodeDto(), accessToken);
			const newUrl = 'https://comprehensive-update.com';
			const newName = 'Fully Updated QR';
			const newConfig = { ...createdQrCode.config, width: 450 };

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					name: newName,
					config: newConfig,
					content: {
						type: 'url',
						data: {
							url: newUrl,
							isEditable: true,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.name).toBe(newName);
			expect(updatedQrCode.config.width).toBe(450);
			if (updatedQrCode.content.type === 'url') {
				// For editable URLs, verify short URL destination was updated
				expect(updatedQrCode.shortUrl?.destinationUrl).toBe(newUrl);
				expect(updatedQrCode.content.data.isEditable).toBe(true);
			}
		});
	});

	describe('PATCH /qr-code/:id - Text Content Type', () => {
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
		});
	});

	describe('PATCH /qr-code/:id - Event Content Type (Dynamic)', () => {
		it('should update event content and maintain short URL', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);
			const newEventData = {
				title: 'Updated Conference 2026',
				location: 'New York City',
				startDate: new Date('2026-06-15T09:00:00Z').toISOString(),
				endDate: new Date('2026-06-17T18:00:00Z').toISOString(),
				description: 'Updated event description',
			};

			// Verify short URL exists for dynamic QR code
			expect(createdQrCode.shortUrl).toBeDefined();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: newEventData,
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.content.type).toBe('event');
			if (updatedQrCode.content.type === 'event') {
				expect(updatedQrCode.content.data.title).toBe(newEventData.title);
				expect(updatedQrCode.content.data.location).toBe(newEventData.location);
				expect(updatedQrCode.content.data.startDate).toBe(newEventData.startDate);
				expect(updatedQrCode.content.data.endDate).toBe(newEventData.endDate);
			}
			// Short URL should still exist
			expect(updatedQrCode.shortUrl).toBeDefined();
		});

		it('should update event with all fields (name, config, content)', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);
			const newName = 'Updated Event QR';
			const newConfig = { ...createdQrCode.config, width: 550 };
			const newEventData = {
				title: 'Mega Conference 2026',
				location: 'San Francisco',
				startDate: new Date('2026-08-01T10:00:00Z').toISOString(),
				endDate: new Date('2026-08-03T17:00:00Z').toISOString(),
				description: 'The biggest tech conference of the year',
			};

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					name: newName,
					config: newConfig,
					content: {
						type: 'event',
						data: newEventData,
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.name).toBe(newName);
			expect(updatedQrCode.config.width).toBe(550);
			if (updatedQrCode.content.type === 'event') {
				expect(updatedQrCode.content.data.title).toBe(newEventData.title);
			}
		});
	});

	describe('PATCH /qr-code/:id - WiFi Content Type', () => {
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
		});
	});

	describe('PATCH /qr-code/:id - vCard Content Type', () => {
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
		});

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
		});

		it('should update dynamic vCard with all fields', async () => {
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

	describe('PATCH /qr-code/:id - Email Content Type', () => {
		it('should update email content', async () => {
			const createdQrCode = await createQrCode(generateEmailQrCodeDto(), accessToken);
			const newEmailData = {
				email: 'updated@example.com',
				subject: 'Updated Subject Line',
				body: 'This is the updated email body text.',
			};

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'email',
						data: newEmailData,
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.content.type).toBe('email');
			if (updatedQrCode.content.type === 'email') {
				expect(updatedQrCode.content.data.email).toBe(newEmailData.email);
				expect(updatedQrCode.content.data.subject).toBe(newEmailData.subject);
				expect(updatedQrCode.content.data.body).toBe(newEmailData.body);
			}
		});

		it('should update email with name', async () => {
			const createdQrCode = await createQrCode(generateEmailQrCodeDto(), accessToken);
			const newName = 'Contact Email QR';
			const newEmailData = {
				email: 'contact@company.com',
				subject: 'Get in touch',
				body: 'Send us a message!',
			};

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					name: newName,
					content: {
						type: 'email',
						data: newEmailData,
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.name).toBe(newName);
			if (updatedQrCode.content.type === 'email') {
				expect(updatedQrCode.content.data.email).toBe(newEmailData.email);
			}
		});
	});

	describe('PATCH /qr-code/:id - Location Content Type', () => {
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
		});

		it('should update location with all fields', async () => {
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
		});
	});

	describe('PATCH /qr-code/:id - Error Cases', () => {
		it('should reject content type change', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'text',
						data: 'Trying to change type',
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
			const error = JSON.parse(response.payload) as { message: string };
			expect(error.message).toContain('content type');
		});

		it('should return 401 when not authenticated', async () => {
			const response = await testServer.inject({
				method: 'PATCH',
				url: `${QR_CODE_API_PATH}/some_id`,
				payload: { name: 'Test' },
			});

			expect(response.statusCode).toBe(401);
		});

		it("should return 403 when updating another user's QR code", async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{ name: 'Hacked' },
				accessToken2,
			);

			expect(response.statusCode).toBe(403);
		});

		it('should return 404 when QR code does not exist', async () => {
			const response = await updateQrCodeRequest('non_existent_id', { name: 'Test' }, accessToken);

			expect(response.statusCode).toBe(404);
		});

		// TODO: Re-enable when backend implements config validation for negative values
		it('should return 400 for invalid config values', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			// Test with a completely invalid config structure to trigger validation
			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					config: {
						width: -100, // Invalid negative width
						height: -100,
						margin: -10,
					} as any,
				},
				accessToken,
			);

			// Backend should validate config values and reject negative dimensions
			expect(response.statusCode).toBe(400);
		});

		it('should handle empty update payload gracefully', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(createdQrCode.id, {}, accessToken);

			expect(response.statusCode).toBe(200);
		});
	});

	describe('PATCH /qr-code/:id - Dynamic vs Non-Dynamic', () => {
		it('should verify non-dynamic URL QR code has no short URL', async () => {
			const createdQrCode = await createQrCode(generateQrCodeDto(), accessToken);

			// Non-editable URL should not have a short URL
			expect(createdQrCode.shortUrl).toBeNull();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: 'https://another-static.com',
							isEditable: false,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(updatedQrCode.shortUrl).toBeNull();
		});

		it('should verify dynamic URL QR code maintains short URL after update', async () => {
			const createdQrCode = await createQrCode(generateEditableUrlQrCodeDto(), accessToken);
			const originalShortCode = createdQrCode.shortUrl?.shortCode;

			expect(originalShortCode).toBeDefined();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'url',
						data: {
							url: 'https://updated-dynamic.com',
							isEditable: true,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			// Short code should remain the same
			expect(updatedQrCode.shortUrl?.shortCode).toBe(originalShortCode);
			// Destination URL should be updated
			expect(updatedQrCode.shortUrl?.destinationUrl).toBe('https://updated-dynamic.com');
		});

		it('should verify event QR code maintains short URL after update', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);
			const originalShortCode = createdQrCode.shortUrl?.shortCode;

			expect(originalShortCode).toBeDefined();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: {
							title: 'Updated Event',
							location: 'Updated Location',
							startDate: new Date('2026-09-01T10:00:00Z').toISOString(),
							endDate: new Date('2026-09-03T17:00:00Z').toISOString(),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			// Short code should remain the same for dynamic QR codes
			expect(updatedQrCode.shortUrl?.shortCode).toBe(originalShortCode);
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
		});
	});
});

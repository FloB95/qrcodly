import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import { generateEventQrCodeDto, getTestContext, QR_CODE_API_PATH } from './utils';

describe('updateQrCode - Event Content Type', () => {
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

	it('should update event content and maintain short URL', async () => {
		const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);
		const newEventData = {
			title: 'Updated Conference 2026',
			location: 'New York City',
			startDate: new Date('2026-06-15T09:00:00Z').toISOString(),
			endDate: new Date('2026-06-17T18:00:00Z').toISOString(),
			description: 'Updated event description',
		};

		// Verify short URL exists for dynamic QR code (events are always dynamic)
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

		// qrCodeData should contain short URL (events are always dynamic)
		expect(updatedQrCode.qrCodeData).toContain('/u/');
		expect(updatedQrCode.qrCodeData).toContain(updatedQrCode.shortUrl?.shortCode);
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

		// qrCodeData should still use the same short code
		expect(updatedQrCode.qrCodeData).toContain(originalShortCode);
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

	it('should update event with minimal required fields', async () => {
		const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);
		const newEventData = {
			title: 'Minimal Event',
			startDate: new Date('2026-10-01T10:00:00Z').toISOString(),
			endDate: new Date('2026-10-02T10:00:00Z').toISOString(),
		};

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
		if (updatedQrCode.content.type === 'event') {
			expect(updatedQrCode.content.data.title).toBe(newEventData.title);
			expect(updatedQrCode.content.data.location).toBeUndefined();
			expect(updatedQrCode.content.data.description).toBeUndefined();
		}
	});

	it('should update event with URL', async () => {
		const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);
		const newEventData = {
			title: 'Event with URL',
			startDate: new Date('2026-11-01T10:00:00Z').toISOString(),
			endDate: new Date('2026-11-02T10:00:00Z').toISOString(),
			url: 'https://example.com/event',
		};

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
		if (updatedQrCode.content.type === 'event') {
			expect(updatedQrCode.content.data.url).toBe(newEventData.url);
		}
	});

	describe('Validation', () => {
		it('should reject event when endDate is before startDate', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: {
							title: 'Invalid Event',
							startDate: new Date('2026-06-15T10:00:00Z').toISOString(),
							endDate: new Date('2026-06-14T10:00:00Z').toISOString(),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
			const error = JSON.parse(response.payload);
			expect(error.message).toContain('End date must be after start date');
		});

		it('should reject event when endDate equals startDate', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);
			const sameDate = new Date('2026-06-15T10:00:00Z').toISOString();

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: {
							title: 'Same Date Event',
							startDate: sameDate,
							endDate: sameDate,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject invalid date format', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: {
							title: 'Invalid Date Event',
							startDate: 'not-a-date',
							endDate: new Date().toISOString(),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject empty event title', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: {
							title: '',
							startDate: new Date('2026-06-15T10:00:00Z').toISOString(),
							endDate: new Date('2026-06-16T10:00:00Z').toISOString(),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject event title exceeding max length (200 chars)', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: {
							title: 'a'.repeat(201),
							startDate: new Date('2026-06-15T10:00:00Z').toISOString(),
							endDate: new Date('2026-06-16T10:00:00Z').toISOString(),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject event description exceeding max length (500 chars)', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: {
							title: 'Event',
							description: 'a'.repeat(501),
							startDate: new Date('2026-06-15T10:00:00Z').toISOString(),
							endDate: new Date('2026-06-16T10:00:00Z').toISOString(),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject event location exceeding max length (200 chars)', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: {
							title: 'Event',
							location: 'a'.repeat(201),
							startDate: new Date('2026-06-15T10:00:00Z').toISOString(),
							endDate: new Date('2026-06-16T10:00:00Z').toISOString(),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject event with invalid URL', async () => {
			const createdQrCode = await createQrCode(generateEventQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'event',
						data: {
							title: 'Event',
							url: 'not-a-valid-url',
							startDate: new Date('2026-06-15T10:00:00Z').toISOString(),
							endDate: new Date('2026-06-16T10:00:00Z').toISOString(),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});
	});
});

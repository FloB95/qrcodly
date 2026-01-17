import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import {
	generateEventQrCodeDto,
	getTestContext,
	releaseTestContext,
	createQrCodeRequest,
} from './utils';

describe('createQrCode - Event Content Type', () => {
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

	it('should create an event QR code (always dynamic)', async () => {
		const createQrCodeDto = generateEventQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('event');
		if (receivedQrCode.content.type === 'event' && createQrCodeDto.content.type === 'event') {
			expect(receivedQrCode.content.data.title).toBe(createQrCodeDto.content.data.title);
			expect(receivedQrCode.content.data.location).toBe(createQrCodeDto.content.data.location);
			expect(receivedQrCode.content.data.startDate).toBe(createQrCodeDto.content.data.startDate);
			expect(receivedQrCode.content.data.endDate).toBe(createQrCodeDto.content.data.endDate);
			expect(receivedQrCode.content.data.description).toBe(
				createQrCodeDto.content.data.description,
			);
		}
		expect(receivedQrCode.shortUrl).toBeDefined();
		expect(receivedQrCode.shortUrl?.shortCode).toEqual(expect.any(String));
		expect(receivedQrCode.shortUrl?.destinationUrl).toContain(receivedQrCode.id);
		expect(receivedQrCode.shortUrl?.isActive).toBe(true);
	});

	it('should validate date format for event', async () => {
		const invalidDateDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: 'Test Event',
					startDate: 'not-a-date',
					endDate: new Date().toISOString(),
				},
			},
		};
		const response = await createRequest(invalidDateDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject event when endDate is before startDate', async () => {
		const invalidDateOrderDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: 'Test Event',
					startDate: new Date('2026-06-15T10:00:00Z').toISOString(),
					endDate: new Date('2026-06-14T10:00:00Z').toISOString(),
				},
			},
		};
		const response = await createRequest(invalidDateOrderDto, accessToken);
		expect(response.statusCode).toBe(400);

		const error = JSON.parse(response.payload);
		expect(error.message).toContain('End date must be after start date');
	});

	it('should reject event when endDate equals startDate', async () => {
		const sameDate = new Date('2026-06-15T10:00:00Z').toISOString();
		const invalidDateOrderDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: 'Test Event',
					startDate: sameDate,
					endDate: sameDate,
				},
			},
		};
		const response = await createRequest(invalidDateOrderDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject empty event title', async () => {
		const startDate = new Date('2026-06-15T10:00:00Z');
		const endDate = new Date('2026-06-16T10:00:00Z');
		const invalidTitleDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: '',
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			},
		};
		const response = await createRequest(invalidTitleDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject event title exceeding max length (200 chars)', async () => {
		const startDate = new Date('2026-06-15T10:00:00Z');
		const endDate = new Date('2026-06-16T10:00:00Z');
		const invalidTitleDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: 'a'.repeat(201),
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			},
		};
		const response = await createRequest(invalidTitleDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject event description exceeding max length (500 chars)', async () => {
		const startDate = new Date('2026-06-15T10:00:00Z');
		const endDate = new Date('2026-06-16T10:00:00Z');
		const invalidDescDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: 'Test Event',
					description: 'a'.repeat(501),
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			},
		};
		const response = await createRequest(invalidDescDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject event location exceeding max length (200 chars)', async () => {
		const startDate = new Date('2026-06-15T10:00:00Z');
		const endDate = new Date('2026-06-16T10:00:00Z');
		const invalidLocationDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: 'Test Event',
					location: 'a'.repeat(201),
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			},
		};
		const response = await createRequest(invalidLocationDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject event with invalid URL', async () => {
		const startDate = new Date('2026-06-15T10:00:00Z');
		const endDate = new Date('2026-06-16T10:00:00Z');
		const invalidUrlDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: 'Test Event',
					url: 'not-a-valid-url',
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			},
		};
		const response = await createRequest(invalidUrlDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should create event with valid URL', async () => {
		const startDate = new Date('2026-06-15T10:00:00Z');
		const endDate = new Date('2026-06-16T10:00:00Z');
		const validUrlDto: TCreateQrCodeDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: 'Test Event',
					url: 'https://example.com/event',
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			},
		};
		const response = await createRequest(validUrlDto, accessToken);
		expect(response.statusCode).toBe(201);
	});

	it('should create event with minimal required fields', async () => {
		const startDate = new Date('2026-06-15T10:00:00Z');
		const endDate = new Date('2026-06-16T10:00:00Z');
		const minimalEventDto: TCreateQrCodeDto = {
			...generateEventQrCodeDto(),
			content: {
				type: 'event' as const,
				data: {
					title: 'Minimal Event',
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			},
		};
		const response = await createRequest(minimalEventDto, accessToken);
		expect(response.statusCode).toBe(201);
	});
});

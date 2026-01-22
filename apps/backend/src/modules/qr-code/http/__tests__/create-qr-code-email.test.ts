import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { generateEmailQrCodeDto, getTestContext, createQrCodeRequest } from './utils';

describe('createQrCode - Email Content Type', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const createRequest = async (payload?: TCreateQrCodeDto, token?: string) =>
		createQrCodeRequest(testServer, payload, token);

	it('should create an email QR code', async () => {
		const createQrCodeDto = generateEmailQrCodeDto();
		const response = await createRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(receivedQrCode.content.type).toBe('email');
		if (receivedQrCode.content.type === 'email' && createQrCodeDto.content.type === 'email') {
			expect(receivedQrCode.content.data.email).toBe(createQrCodeDto.content.data.email);
			expect(receivedQrCode.content.data.subject).toBe(createQrCodeDto.content.data.subject);
			expect(receivedQrCode.content.data.body).toBe(createQrCodeDto.content.data.body);
		}
		expect(receivedQrCode.shortUrl).toBeNull();

		// Verify qrCodeData contains mailto format
		if (createQrCodeDto.content.type === 'email') {
			const { email, subject, body } = createQrCodeDto.content.data;
			const expectedMailto = `mailto:${email}?subject=${encodeURIComponent(subject ?? '')}&body=${encodeURIComponent(body ?? '')}`;
			expect(receivedQrCode.qrCodeData).toBe(expectedMailto);
		}
	});

	it('should validate email format', async () => {
		const invalidEmailDto = {
			...generateEmailQrCodeDto(),
			content: {
				type: 'email' as const,
				data: {
					email: 'not-an-email',
					subject: 'Test',
					body: 'Test message',
				},
			},
		};
		const response = await createRequest(invalidEmailDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject email address exceeding max length (100 chars)', async () => {
		const longEmail = 'a'.repeat(90) + '@example.com';
		const invalidEmailDto = {
			...generateEmailQrCodeDto(),
			content: {
				type: 'email' as const,
				data: {
					email: longEmail,
				},
			},
		};
		const response = await createRequest(invalidEmailDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject subject exceeding max length (250 chars)', async () => {
		const invalidEmailDto = {
			...generateEmailQrCodeDto(),
			content: {
				type: 'email' as const,
				data: {
					email: 'test@example.com',
					subject: 'a'.repeat(251),
				},
			},
		};
		const response = await createRequest(invalidEmailDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should reject body exceeding max length (1000 chars)', async () => {
		const invalidEmailDto = {
			...generateEmailQrCodeDto(),
			content: {
				type: 'email' as const,
				data: {
					email: 'test@example.com',
					body: 'a'.repeat(1001),
				},
			},
		};
		const response = await createRequest(invalidEmailDto, accessToken);
		expect(response.statusCode).toBe(400);
	});

	it('should create email QR code with optional fields omitted', async () => {
		const minimalEmailDto: TCreateQrCodeDto = {
			...generateEmailQrCodeDto(),
			content: {
				type: 'email' as const,
				data: {
					email: 'test@example.com',
				},
			},
		};
		const response = await createRequest(minimalEmailDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		// Verify qrCodeData for email-only (no subject/body)
		expect(receivedQrCode.qrCodeData).toBe('mailto:test@example.com?subject=&body=');
	});
});

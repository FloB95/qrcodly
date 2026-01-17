import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto, TUpdateQrCodeDto } from '@shared/schemas';
import {
	generateEmailQrCodeDto,
	getTestContext,
	releaseTestContext,
	QR_CODE_API_PATH,
} from './utils';

describe('updateQrCode - Email Content Type', () => {
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

		// Verify qrCodeData contains mailto format
		const expectedMailto = `mailto:${newEmailData.email}?subject=${encodeURIComponent(newEmailData.subject)}&body=${encodeURIComponent(newEmailData.body)}`;
		expect(updatedQrCode.qrCodeData).toBe(expectedMailto);
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

		// Verify qrCodeData
		const expectedMailto = `mailto:${newEmailData.email}?subject=${encodeURIComponent(newEmailData.subject)}&body=${encodeURIComponent(newEmailData.body)}`;
		expect(updatedQrCode.qrCodeData).toBe(expectedMailto);
	});

	it('should update email with all fields (name, config, content)', async () => {
		const createdQrCode = await createQrCode(generateEmailQrCodeDto(), accessToken);
		const newName = 'Support Email';
		const newConfig = { ...createdQrCode.config, width: 400 };
		const newEmailData = {
			email: 'support@company.com',
			subject: 'Support Request',
			body: 'Please describe your issue:',
		};

		const response = await updateQrCodeRequest(
			createdQrCode.id,
			{
				name: newName,
				config: newConfig,
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
		expect(updatedQrCode.config.width).toBe(400);

		// Verify qrCodeData
		const expectedMailto = `mailto:${newEmailData.email}?subject=${encodeURIComponent(newEmailData.subject)}&body=${encodeURIComponent(newEmailData.body)}`;
		expect(updatedQrCode.qrCodeData).toBe(expectedMailto);
	});

	it('should update email with only email address (no subject/body)', async () => {
		const createdQrCode = await createQrCode(generateEmailQrCodeDto(), accessToken);
		const newEmailData = {
			email: 'minimal@example.com',
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

		// Verify qrCodeData for email-only
		expect(updatedQrCode.qrCodeData).toBe('mailto:minimal@example.com?subject=&body=');
	});

	it('should handle special characters in subject and body', async () => {
		const createdQrCode = await createQrCode(generateEmailQrCodeDto(), accessToken);
		const newEmailData = {
			email: 'test@example.com',
			subject: 'Question: How are you?',
			body: 'Hello!\nLine 2\n&special=chars',
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
		if (updatedQrCode.content.type === 'email') {
			expect(updatedQrCode.content.data.subject).toBe(newEmailData.subject);
			expect(updatedQrCode.content.data.body).toBe(newEmailData.body);
		}

		// Verify encoding in qrCodeData
		expect(updatedQrCode.qrCodeData).toContain(encodeURIComponent(newEmailData.subject));
		expect(updatedQrCode.qrCodeData).toContain(encodeURIComponent(newEmailData.body));
	});

	describe('Validation', () => {
		it('should reject invalid email format', async () => {
			const createdQrCode = await createQrCode(generateEmailQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'email',
						data: {
							email: 'not-an-email',
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject email address exceeding max length (100 chars)', async () => {
			const createdQrCode = await createQrCode(generateEmailQrCodeDto(), accessToken);
			const longEmail = 'a'.repeat(90) + '@example.com';

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'email',
						data: {
							email: longEmail,
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject subject exceeding max length (250 chars)', async () => {
			const createdQrCode = await createQrCode(generateEmailQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'email',
						data: {
							email: 'test@example.com',
							subject: 'a'.repeat(251),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});

		it('should reject body exceeding max length (1000 chars)', async () => {
			const createdQrCode = await createQrCode(generateEmailQrCodeDto(), accessToken);

			const response = await updateQrCodeRequest(
				createdQrCode.id,
				{
					content: {
						type: 'email',
						data: {
							email: 'test@example.com',
							body: 'a'.repeat(1001),
						},
					},
				},
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});
	});
});

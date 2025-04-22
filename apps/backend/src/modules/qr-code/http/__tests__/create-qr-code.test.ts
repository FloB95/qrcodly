import { API_BASE_PATH } from '@/core/config/constants';
import { faker } from '@faker-js/faker';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import {
	QrCodeDefaults,
	type TCreateQrCodeResponseDto,
	type TCreateQrCodeDto,
} from '@shared/schemas';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

/**
 * Generates a new random QR code DTO.
 */
const generateQrCodeDto = (): TCreateQrCodeDto => ({
	content: {
		url: faker.internet.url(),
		isEditable: false, // TODO add as param
	},
	contentType: 'url',
	config: QrCodeDefaults,
});

/**
 * Create QR Code API Tests
 */
describe('createQrCode', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	const createQrCodeRequest = async (payload: object, token?: string) =>
		testServer.inject({
			method: 'POST',
			url: QR_CODE_API_PATH,
			payload,
			headers: {
				'Content-Type': 'application/json',
				Authorization: token ? `Bearer ${token}` : '',
			},
		});

	beforeAll(async () => {
		const serverSetup = await getTestServerWithUserAuth();
		testServer = serverSetup.testServer;
		accessToken = serverSetup.accessToken;
	});

	afterAll(async () => {
		await shutDownServer();
	});

	it('should create a QR code and return status code 201', async () => {
		const createQrCodeDto = generateQrCodeDto();
		const response = await createQrCodeRequest(createQrCodeDto, accessToken);

		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TCreateQrCodeResponseDto;
		expect(receivedQrCode).toMatchObject({
			success: true,
			isStored: true,
			qrCodeId: expect.any(String),
		});
	});

	it('should create a QR code without user and not store it', async () => {
		const createQrCodeDto = generateQrCodeDto();
		const response = await createQrCodeRequest(createQrCodeDto);

		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TCreateQrCodeResponseDto;
		expect(receivedQrCode).toMatchObject({
			success: true,
			isStored: false,
			qrCodeId: expect.any(String),
		});
	});

	it('should return 400 for invalid request body', async () => {
		const response = await createQrCodeRequest({}, accessToken);
		expect(response.statusCode).toBe(400);

		const { message, code, fieldErrors } = JSON.parse(response.payload);
		expect(message).toBeDefined();
		expect(code).toBe(400);
		expect(Array.isArray(fieldErrors)).toBe(true);
		expect((fieldErrors as []).length).toBeGreaterThan(0);
	});
});

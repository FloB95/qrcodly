import { API_BASE_PATH } from '@/core/config/constants';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import { generateQrCodeDto } from './utils';
import { type TQrCodeWithRelationsResponseDto } from '@shared/schemas';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

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

	const assertQrCodeResponse = (
		response: TQrCodeWithRelationsResponseDto,
		createdByExpected: string | null,
	) => {
		expect(response.id).toEqual(expect.any(String));
		expect(response.createdAt).toEqual(expect.any(String));
		expect(['string', 'object', 'null']).toContain(typeof response.updatedAt);

		expect(response.config).toBeDefined();
		expect(response.config.width).toEqual(expect.any(Number));
		expect(response.config.height).toEqual(expect.any(Number));
		expect(response.config.margin).toEqual(expect.any(Number));
		expect(response.config.dotsOptions).toBeDefined();
		expect(response.config.cornersSquareOptions).toBeDefined();
		expect(response.config.cornersDotOptions).toBeDefined();
		expect(response.config.backgroundOptions).toBeDefined();
		if (response.config.image) expect(response.config.image).toEqual(expect.any(String));

		expect(response.content).toBeDefined();
		expect(response.previewImage).toBeNull();

		if (response.shortUrl !== null) {
			expect(response.shortUrl).toBeDefined();
		} else {
			expect(response.shortUrl).toBeNull();
		}
	};

	it('should create a QR code and return status code 201', async () => {
		const createQrCodeDto = generateQrCodeDto();
		const response = await createQrCodeRequest(createQrCodeDto, accessToken);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		assertQrCodeResponse(receivedQrCode, expect.any(String));
	});

	it('should create a QR code without user and not store it', async () => {
		const createQrCodeDto = generateQrCodeDto();
		const response = await createQrCodeRequest(createQrCodeDto);
		expect(response.statusCode).toBe(201);

		const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		assertQrCodeResponse(receivedQrCode, null);
	});

	it('should return 400 for invalid request body', async () => {
		const response = await createQrCodeRequest({}, accessToken);
		expect(response.statusCode).toBe(400);

		const { message, code, fieldErrors } = JSON.parse(response.payload);
		expect(message).toBeDefined();
		expect(code).toBe(400);
		expect(Array.isArray(fieldErrors)).toBe(true);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(fieldErrors.length).toBeGreaterThan(0);
	});
});

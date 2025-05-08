import { API_BASE_PATH } from '@/core/config/constants';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import { type TQrCodeResponseDto } from '@shared/schemas';
import { container } from 'tsyringe';
import { type User } from '@clerk/fastify';
import { type TQrCode } from '../../domain/entities/qr-code.entity';
import { CreateQrCodeUseCase } from '../../useCase/create-qr-code.use-case';
import { generateQrCodeDto } from './utils';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

/**
 * Create QR Code API Tests
 */
describe('createQrCode', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let user: User;
	let user2: User;
	let createQrCode: TQrCode;

	const getQrCodeRequest = async (id: string, token?: string) =>
		testServer.inject({
			method: 'GET',
			url: `${QR_CODE_API_PATH}/${id}`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: token ? `Bearer ${token}` : '',
			},
		});

	beforeAll(async () => {
		const serverSetup = await getTestServerWithUserAuth();
		testServer = serverSetup.testServer;
		accessToken = serverSetup.accessToken;
		user = serverSetup.user;
		user2 = serverSetup.user2;
	});

	afterAll(async () => {
		await shutDownServer();
	});

	it('should create a QR code and return status code 201', async () => {
		const createQrCodeDto = generateQrCodeDto();
		createQrCode = await container.resolve(CreateQrCodeUseCase).execute(createQrCodeDto, user.id);
		const response = await getQrCodeRequest(createQrCode.id, accessToken);
		const receivedQrCode = JSON.parse(response.payload) as TQrCodeResponseDto;

		expect(response.statusCode).toBe(200);
		expect(receivedQrCode.id).toMatch(createQrCode.id);
	});

	it('should return a 401 when no authenticated', async () => {
		const response = await getQrCodeRequest(createQrCode.id);
		expect(response.statusCode).toBe(401);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	it('should return a 403 when user try to access other users QrCOde', async () => {
		const createQrCodeDto = generateQrCodeDto();

		createQrCode = await container.resolve(CreateQrCodeUseCase).execute(createQrCodeDto, user2.id);

		const response = await getQrCodeRequest(createQrCode.id, accessToken);
		expect(response.statusCode).toBe(403);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	it('should return a 404 on invalid-id', async () => {
		const response = await getQrCodeRequest('invalid-id', accessToken);
		expect(response.statusCode).toBe(404);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});
});

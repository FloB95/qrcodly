import { API_BASE_PATH } from '@/core/config/constants';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { type User } from '@clerk/fastify';
import { CreateQrCodeUseCase } from '../../useCase/create-qr-code.use-case';
import { generateQrCodeDto } from './utils';
import { PlanName } from '@/core/config/plan.config';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

/**
 * Delete QR Code API Tests
 */
describe('deleteQrCode', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let user: User;
	let user2: User;

	const deleteQrCodeRequest = async (id: string, token?: string) =>
		testServer.inject({
			method: 'DELETE',
			url: `${QR_CODE_API_PATH}/${id}`,
			headers: {
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

	it('should delete a QR code and return status code 200', async () => {
		// Create a QR code for the tests
		const createQrCodeDto = generateQrCodeDto();
		const createdQrCode = await container.resolve(CreateQrCodeUseCase).execute(createQrCodeDto, {
			id: user.id,
			plan: PlanName.FREE,
			tokenType: 'session_token',
		});
		const response = await deleteQrCodeRequest(createdQrCode.id, accessToken);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.payload)).toMatchObject({
			deleted: true,
		});
	});

	it('should return a 401 when not authenticated', async () => {
		const response = await deleteQrCodeRequest('createQrCode.id');
		expect(response.statusCode).toBe(401);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	it('should return 403 when a user tries to delete another user’s QR code', async () => {
		// Create a QR code for user2
		const createQrCodeDto = generateQrCodeDto();
		const otherQrCode = await container.resolve(CreateQrCodeUseCase).execute(createQrCodeDto, {
			id: user2.id,
			plan: PlanName.FREE,
			tokenType: 'session_token',
		});

		// Attempt to delete user2's QR code with user1's token
		const response = await deleteQrCodeRequest(otherQrCode.id, accessToken);
		expect(response.statusCode).toBe(403);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	it('should return 404 when trying to delete a non-existent QR code', async () => {
		const response = await deleteQrCodeRequest('non-existent-id', accessToken);
		expect(response.statusCode).toBe(404);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});
});

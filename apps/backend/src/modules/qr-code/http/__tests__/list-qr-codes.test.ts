/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { API_BASE_PATH } from '@/core/config/constants';
import { faker } from '@faker-js/faker';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import { QrCodeDefaults, type TCreateQrCodeDto } from '@shared/schemas';
import { container } from 'tsyringe';
import { type User } from '@clerk/fastify';
import { CreateQrCodeUseCase } from '../../useCase/create-qr-code.use-case';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

/**
 * Generates a new random QR code DTO.
 */
const generateQrCodeDto = (): TCreateQrCodeDto => ({
	content: {
		type: 'url',
		data: {
			url: faker.internet.url(),
			isEditable: false,
		},
	},
	config: QrCodeDefaults,
});

/**
 * List QR Codes API Tests
 */
describe('listQrCodes', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let user: User;
	let user2: User;

	const listQrCodesRequest = async (queryParams: Record<string, any> = {}, token?: string) =>
		testServer.inject({
			method: 'GET',
			url: `${QR_CODE_API_PATH}?${new URLSearchParams(queryParams).toString()}`,
			headers: {
				Authorization: token ? `Bearer ${token}` : '',
			},
		});

	beforeAll(async () => {
		const serverSetup = await getTestServerWithUserAuth();
		testServer = serverSetup.testServer;
		accessToken = serverSetup.accessToken;
		accessToken2 = serverSetup.accessToken2;
		user = serverSetup.user;
		user2 = serverSetup.user2;

		// Create QR codes for user1
		for (let i = 0; i < 3; i++) {
			const createQrCodeDto = generateQrCodeDto();
			await container.resolve(CreateQrCodeUseCase).execute(createQrCodeDto, user.id);
		}

		// Create QR codes for user2
		for (let i = 0; i < 2; i++) {
			const createQrCodeDto = generateQrCodeDto();
			await container.resolve(CreateQrCodeUseCase).execute(createQrCodeDto, user2.id);
		}
	});

	afterAll(async () => {
		await shutDownServer();
	});

	it('should fetch only the signed-in user’s QR codes and return status code 200', async () => {
		const response = await listQrCodesRequest({}, accessToken);

		expect(response.statusCode).toBe(200);

		const { data, total, page, limit } = JSON.parse(response.payload);
		expect(Array.isArray(data)).toBe(true);
		expect(total).toBe(3); // User1 has 3 QR codes
		expect(page).toBe(1); // Default page
		expect(limit).toBe(10); // Default limit
		data.forEach((qrCode: any) => {
			expect(qrCode.createdBy).toBe(user.id); // Ensure only user1's QR codes are returned
		});
	});

	it('should respect pagination parameters', async () => {
		const response = await listQrCodesRequest({ page: 1, limit: 2 }, accessToken);

		expect(response.statusCode).toBe(200);

		const { data, total, page, limit } = JSON.parse(response.payload);
		expect(data.length).toBe(2); // Limit is 2
		expect(total).toBe(3); // User1 has 3 QR codes
		expect(page).toBe(1);
		expect(limit).toBe(2);
	});

	it('ensure the list works without page and limit parameters', async () => {
		const response = await listQrCodesRequest({}, accessToken2);

		expect(response.statusCode).toBe(200);

		const { data, total } = JSON.parse(response.payload);
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBe(2); // User2 has 2 QR codes
		expect(total).toBe(2);
		data.forEach((qrCode: any) => {
			expect(qrCode.createdBy).toBe(user2.id); // Ensure only user2's QR codes are returned
		});
	});

	it('should return 401 if no authorization token is provided', async () => {
		const response = await listQrCodesRequest();

		expect(response.statusCode).toBe(401);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});
});

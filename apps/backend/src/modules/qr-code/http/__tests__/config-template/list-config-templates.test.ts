/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { API_BASE_PATH } from '@/core/config/constants';
import { faker } from '@faker-js/faker';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import { QrCodeDefaults, type TCreateConfigTemplateDto } from '@shared/schemas';
import { container } from 'tsyringe';
import { CreateConfigTemplateUseCase } from '../../../useCase/config-template/create-config-template.use-case';
import { type User } from '@clerk/fastify';

const CONFIG_TEMPLATE_API_PATH = `${API_BASE_PATH}/config-template`;

/**
 * Generates a new random Config Template DTO.
 */
const generateConfigTemplateDto = (): TCreateConfigTemplateDto => ({
	name: faker.lorem.words(3),
	config: QrCodeDefaults,
});

/**
 * List Config Templates API Tests
 */
describe('listConfigTemplates', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let user: User;
	let user2: User;

	const listConfigTemplatesRequest = async (
		queryParams: Record<string, any> = {},
		token?: string,
	) =>
		testServer.inject({
			method: 'GET',
			url: `${CONFIG_TEMPLATE_API_PATH}?${new URLSearchParams(queryParams).toString()}`,
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

		// Create Config Templates for user1
		for (let i = 0; i < 3; i++) {
			const createConfigTemplateDto = generateConfigTemplateDto();
			await container
				.resolve(CreateConfigTemplateUseCase)
				.execute(createConfigTemplateDto, user.id);
		}

		// Create Config Templates for user2
		for (let i = 0; i < 2; i++) {
			const createConfigTemplateDto = generateConfigTemplateDto();
			await container
				.resolve(CreateConfigTemplateUseCase)
				.execute(createConfigTemplateDto, user2.id);
		}
	});

	afterAll(async () => {
		await shutDownServer();
	});

	it('should fetch only the signed-in user’s Config Templates and return status code 200', async () => {
		const response = await listConfigTemplatesRequest({}, accessToken);

		expect(response.statusCode).toBe(200);

		const { data, total, page, limit } = JSON.parse(response.payload);
		expect(Array.isArray(data)).toBe(true);
		expect(total).toBe(3);
		expect(page).toBe(1);
		expect(limit).toBe(10);
		data.forEach((configTemplate: any) => {
			expect(configTemplate.createdBy).toBe(user.id);
			expect(configTemplate.isPredefined).toBeUndefined();
		});
	});

	it('should respect pagination parameters', async () => {
		const response = await listConfigTemplatesRequest({ page: 1, limit: 2 }, accessToken);

		expect(response.statusCode).toBe(200);

		const { data, total, page, limit } = JSON.parse(response.payload);
		expect(data.length).toBe(2);
		expect(total).toBe(3);
		expect(page).toBe(1);
		expect(limit).toBe(2);
		data.forEach((configTemplate: any) => {
			expect(configTemplate.createdBy).toBe(user.id);
			expect(configTemplate.isPredefined).toBeUndefined();
		});
	});

	it('ensure the list works without page and limit parameters', async () => {
		const response = await listConfigTemplatesRequest({}, accessToken2);

		expect(response.statusCode).toBe(200);

		const { data, total } = JSON.parse(response.payload);
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBe(2);
		expect(total).toBe(2);
		data.forEach((configTemplate: any) => {
			expect(configTemplate.createdBy).toBe(user2.id);
			expect(configTemplate.isPredefined).toBeUndefined();
		});
	});

	it('should return 401 if no authorization token is provided', async () => {
		const response = await listConfigTemplatesRequest();

		expect(response.statusCode).toBe(401);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});
});

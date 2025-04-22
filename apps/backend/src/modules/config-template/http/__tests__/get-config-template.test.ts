/* eslint-disable @typescript-eslint/ban-ts-comment */
import { API_BASE_PATH } from '@/core/config/constants';
import { faker } from '@faker-js/faker';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import {
	type TCreateConfigTemplateDto,
	type TConfigTemplateResponseDto,
	QrCodeDefaults,
} from '@shared/schemas';
import { container } from 'tsyringe';
import { type User } from '@clerk/fastify';
import { CreateConfigTemplateUseCase } from '../../useCase/create-config-template.use-case';
import { type TConfigTemplate } from '../../domain/entities/config-template.entity';

const CONFIG_TEMPLATE_API_PATH = `${API_BASE_PATH}/config-template`;

/**
 * Generates a new random Config Template DTO.
 */
const generateConfigTemplateDto = (): TCreateConfigTemplateDto => ({
	name: faker.lorem.words(3),
	config: QrCodeDefaults,
});

/**
 * Get Config Template API Tests
 */
describe('getConfigTemplate', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let user: User;
	let user2: User;
	let createConfigTemplate: TConfigTemplate;

	const getConfigTemplateRequest = async (id: string, token?: string) =>
		testServer.inject({
			method: 'GET',
			url: `${CONFIG_TEMPLATE_API_PATH}/${id}`,
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

	it('should retrieve a Config Template and return status code 200', async () => {
		const createConfigTemplateDto = generateConfigTemplateDto();
		createConfigTemplate = await container
			.resolve(CreateConfigTemplateUseCase)
			.execute(createConfigTemplateDto, user.id);
		const response = await getConfigTemplateRequest(createConfigTemplate.id, accessToken);
		const receivedConfigTemplate = JSON.parse(response.payload) as TConfigTemplateResponseDto;

		expect(response.statusCode).toBe(200);
		expect(receivedConfigTemplate.id).toBe(createConfigTemplate.id);
		expect(receivedConfigTemplate.name).toBe(createConfigTemplateDto.name);
		expect(receivedConfigTemplate.config).toEqual(createConfigTemplateDto.config);

		// @ts-ignore expecting the isPredefined property to be undefined
		expect(receivedConfigTemplate.isPredefined).toBeUndefined();
	});

	it('should return a 401 when not authenticated', async () => {
		const response = await getConfigTemplateRequest(createConfigTemplate.id);
		expect(response.statusCode).toBe(401);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	it('should return a 403 when a user tries to access another user’s Config Template', async () => {
		const createConfigTemplateDto = generateConfigTemplateDto();

		createConfigTemplate = await container
			.resolve(CreateConfigTemplateUseCase)
			.execute(createConfigTemplateDto, user2.id);

		const response = await getConfigTemplateRequest(createConfigTemplate.id, accessToken);
		expect(response.statusCode).toBe(403);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	it('should return a 404 for an invalid ID', async () => {
		const response = await getConfigTemplateRequest('invalid-id', accessToken);
		expect(response.statusCode).toBe(404);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});
});

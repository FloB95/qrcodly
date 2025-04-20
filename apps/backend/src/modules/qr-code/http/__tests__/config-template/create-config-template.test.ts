/* eslint-disable @typescript-eslint/ban-ts-comment */
import { API_BASE_PATH } from '@/core/config/constants';
import { faker } from '@faker-js/faker';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import {
	QrCodeDefaults,
	type TConfigTemplateResponseDto,
	type TCreateConfigTemplateDto,
} from '@shared/schemas';

const CONFIG_TEMPLATE_API_PATH = `${API_BASE_PATH}/config-template`;

/**
 * Generates a new random Config Template DTO.
 */
const generateConfigTemplateDto = (): TCreateConfigTemplateDto => ({
	name: faker.lorem.words(3),
	config: QrCodeDefaults,
});

/**
 * Create Config Template API Tests
 */
describe('createConfigTemplate', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	const createConfigTemplateRequest = async (payload: object, token?: string) =>
		testServer.inject({
			method: 'POST',
			url: CONFIG_TEMPLATE_API_PATH,
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

	it('should create a Config Template and return status code 201', async () => {
		const createConfigTemplateDto = generateConfigTemplateDto();
		const response = await createConfigTemplateRequest(createConfigTemplateDto, accessToken);

		expect(response.statusCode).toBe(201);

		const receivedConfigTemplate = JSON.parse(response.payload) as TConfigTemplateResponseDto;
		expect(receivedConfigTemplate).toMatchObject({
			id: expect.any(String),
			name: createConfigTemplateDto.name,
			config: createConfigTemplateDto.config,
			createdAt: expect.any(String),
		});

		expect(
			typeof receivedConfigTemplate.previewImage === 'string' ||
				receivedConfigTemplate.previewImage === null,
		).toBe(true);

		expect(
			typeof receivedConfigTemplate.updatedAt === 'string' ||
				receivedConfigTemplate.updatedAt === null,
		).toBe(true);

		// @ts-ignore - Ensure isPredefined is not set
		expect(receivedConfigTemplate.isPredefined).toBeUndefined();
	});

	it('should return a 401 when not authenticated', async () => {
		const createConfigTemplateDto = generateConfigTemplateDto();
		const response = await createConfigTemplateRequest(createConfigTemplateDto);
		expect(response.statusCode).toBe(401);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	it('should return 400 for invalid request body', async () => {
		const response = await createConfigTemplateRequest({}, accessToken);
		expect(response.statusCode).toBe(400);

		const { message, code, fieldErrors } = JSON.parse(response.payload);
		expect(message).toBeDefined();
		expect(code).toBe(400);
		expect(Array.isArray(fieldErrors)).toBe(true);
		expect((fieldErrors as []).length).toBeGreaterThan(0);
	});
});

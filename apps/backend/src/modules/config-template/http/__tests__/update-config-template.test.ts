import { API_BASE_PATH } from '@/core/config/constants';
import { faker } from '@faker-js/faker';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import type { FastifyInstance } from 'fastify';
import {
	QrCodeDefaults,
	type TConfigTemplateResponseDto,
	type TCreateConfigTemplateDto,
} from '@shared/schemas';

const CONFIG_TEMPLATE_API_PATH = `${API_BASE_PATH}/config-template`;

const generateConfigTemplateDto = (): TCreateConfigTemplateDto => ({
	name: faker.lorem.words(3),
	config: QrCodeDefaults,
});

describe('updateConfigTemplate', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	const createConfigTemplateRequest = async (payload: object, token: string) =>
		testServer.inject({
			method: 'POST',
			url: CONFIG_TEMPLATE_API_PATH,
			payload,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

	const updateConfigTemplateRequest = async (id: string, payload: object, token: string) =>
		testServer.inject({
			method: 'PATCH',
			url: `${CONFIG_TEMPLATE_API_PATH}/${id}`,
			payload,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

	beforeAll(async () => {
		const serverSetup = await getTestServerWithUserAuth();
		testServer = serverSetup.testServer;
		accessToken = serverSetup.accessToken;
		accessToken2 = serverSetup.accessToken2;
	});

	afterAll(async () => {
		await shutDownServer();
	});

	describe('PATCH /config-template/:id', () => {
		it('should update template name successfully and return 200', async () => {
			// Create a template first
			const createDto = generateConfigTemplateDto();
			const createResponse = await createConfigTemplateRequest(createDto, accessToken);
			const createdTemplate = JSON.parse(createResponse.payload) as TConfigTemplateResponseDto;

			const updateDto = { name: 'Updated Template Name' };
			const response = await updateConfigTemplateRequest(
				createdTemplate.id,
				updateDto,
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedTemplate = JSON.parse(response.payload) as TConfigTemplateResponseDto;
			expect(updatedTemplate.name).toBe(updateDto.name);
		});

		it('should update template config successfully', async () => {
			const createDto = generateConfigTemplateDto();
			const createResponse = await createConfigTemplateRequest(createDto, accessToken);
			const createdTemplate = JSON.parse(createResponse.payload) as TConfigTemplateResponseDto;

			const updateDto = {
				config: {
					...createdTemplate.config,
					width: 500,
					height: 500,
				},
			};
			const response = await updateConfigTemplateRequest(
				createdTemplate.id,
				updateDto,
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedTemplate = JSON.parse(response.payload) as TConfigTemplateResponseDto;
			expect(updatedTemplate.config.width).toBe(500);
			expect(updatedTemplate.config.height).toBe(500);
		});

		it('should update both name and config together', async () => {
			const createDto = generateConfigTemplateDto();
			const createResponse = await createConfigTemplateRequest(createDto, accessToken);
			const createdTemplate = JSON.parse(createResponse.payload) as TConfigTemplateResponseDto;

			const updateDto = {
				name: 'New Name',
				config: {
					...createdTemplate.config,
					width: 600,
				},
			};
			const response = await updateConfigTemplateRequest(
				createdTemplate.id,
				updateDto,
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const updatedTemplate = JSON.parse(response.payload) as TConfigTemplateResponseDto;
			expect(updatedTemplate.name).toBe('New Name');
			expect(updatedTemplate.config.width).toBe(600);
		});

		it('should return 401 when not authenticated', async () => {
			const response = await testServer.inject({
				method: 'PATCH',
				url: `${CONFIG_TEMPLATE_API_PATH}/some_id`,
				payload: { name: 'Test' },
			});

			expect(response.statusCode).toBe(401);
		});

		it("should return 403 when updating another user's template", async () => {
			// User 1 creates a template
			const createDto = generateConfigTemplateDto();
			const createResponse = await createConfigTemplateRequest(createDto, accessToken);
			const createdTemplate = JSON.parse(createResponse.payload) as TConfigTemplateResponseDto;

			// User 2 tries to update it
			const updateDto = { name: 'Hacked' };
			const response = await updateConfigTemplateRequest(
				createdTemplate.id,
				updateDto,
				accessToken2,
			);

			expect(response.statusCode).toBe(403);
		});

		it('should return 404 when template does not exist', async () => {
			const updateDto = { name: 'Test' };
			const response = await updateConfigTemplateRequest('non_existent_id', updateDto, accessToken);

			expect(response.statusCode).toBe(404);
		});

		it('should return 400 for invalid config structure', async () => {
			const createDto = generateConfigTemplateDto();
			const createResponse = await createConfigTemplateRequest(createDto, accessToken);
			const createdTemplate = JSON.parse(createResponse.payload) as TConfigTemplateResponseDto;

			const invalidDto = {
				config: {
					width: -100, // Invalid: negative width
				},
			};
			const response = await updateConfigTemplateRequest(
				createdTemplate.id,
				invalidDto,
				accessToken,
			);

			expect(response.statusCode).toBe(400);
		});
	});
});

import { API_BASE_PATH } from '@/core/config/constants';
import { faker } from '@faker-js/faker';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import { QrCodeDefaults, type TCreateConfigTemplateDto } from '@shared/schemas';
import { container } from 'tsyringe';
import { CreateConfigTemplateUseCase } from '../../../useCase/config-template/create-config-template.use-case';
import { type User } from '@clerk/fastify';
import ConfigTemplateRepository from '@/modules/qr-code/domain/repository/config-template.repository';

const CONFIG_TEMPLATE_API_PATH = `${API_BASE_PATH}/config-template`;

/**
 * Generates a new random Config Template DTO.
 */
const generateConfigTemplateDto = (): TCreateConfigTemplateDto => ({
	name: faker.lorem.words(3),
	config: QrCodeDefaults,
});

/**
 * Delete Config Template API Tests
 */
describe('deleteConfigTemplate', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let user: User;
	let user2: User;

	const deleteConfigTemplateRequest = async (id: string, token?: string) =>
		testServer.inject({
			method: 'DELETE',
			url: `${CONFIG_TEMPLATE_API_PATH}/${id}`,
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

	it('should delete a Config Template and return status code 200', async () => {
		// Create a Config Template for the tests
		const createConfigTemplateDto = generateConfigTemplateDto();
		const createdConfigTemplate = await container
			.resolve(CreateConfigTemplateUseCase)
			.execute(createConfigTemplateDto, user.id);
		const response = await deleteConfigTemplateRequest(createdConfigTemplate.id, accessToken);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.payload)).toMatchObject({
			deleted: true,
		});

		// Verify that the Config Template is deleted
		const found = await container
			.resolve(ConfigTemplateRepository)
			.findOneById(createdConfigTemplate.id);
		expect(found).toBeUndefined();
	});

	it('should return a 401 when not authenticated', async () => {
		const response = await deleteConfigTemplateRequest('createdConfigTemplate.id');
		expect(response.statusCode).toBe(401);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	it('should return 403 when a user tries to delete another user’s Config Template', async () => {
		// Create a Config Template for user2
		const createConfigTemplateDto = generateConfigTemplateDto();
		const otherConfigTemplate = await container
			.resolve(CreateConfigTemplateUseCase)
			.execute(createConfigTemplateDto, user2.id);

		// Attempt to delete user2's Config Template with user1's token
		const response = await deleteConfigTemplateRequest(otherConfigTemplate.id, accessToken);
		expect(response.statusCode).toBe(403);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	it('should return 404 when trying to delete a non-existent Config Template', async () => {
		const response = await deleteConfigTemplateRequest('non-existent-id', accessToken);
		expect(response.statusCode).toBe(404);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});
});

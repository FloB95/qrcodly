/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { API_BASE_PATH } from '@/core/config/constants';
import { faker } from '@faker-js/faker';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { type FastifyInstance } from 'fastify';
import { QrCodeDefaults, type TCreateConfigTemplateDto } from '@shared/schemas';
import { container } from 'tsyringe';
import { type User } from '@clerk/fastify';
import { CreateConfigTemplateUseCase } from '../../useCase/create-config-template.use-case';
import ConfigTemplateRepository from '../../domain/repository/config-template.repository';

const CONFIG_TEMPLATE_API_PATH = `${API_BASE_PATH}/config-template/predefined`;

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
describe('list predefined templates', () => {
	let testServer: FastifyInstance;
	let user: User;

	const listPredefinedConfigTemplatesRequest = async () =>
		testServer.inject({
			method: 'GET',
			url: `${CONFIG_TEMPLATE_API_PATH}`,
		});

	beforeAll(async () => {
		const serverSetup = await getTestServerWithUserAuth();
		testServer = serverSetup.testServer;
		user = serverSetup.user;

		// Create Predefined Config Templates for user1
		for (let i = 0; i < 3; i++) {
			const createConfigTemplateDto = generateConfigTemplateDto();
			const createdConfigTemplate = await container
				.resolve(CreateConfigTemplateUseCase)
				.execute(createConfigTemplateDto, user.id);
			await container.resolve(ConfigTemplateRepository).update(createdConfigTemplate, {
				isPredefined: true,
			});
		}
	});

	afterAll(async () => {
		await shutDownServer();
	});

	it('should list the predefined templates and return status code 200', async () => {
		const response = await listPredefinedConfigTemplatesRequest();
		expect(response.statusCode).toBe(200);

		const { data, total, page, limit } = JSON.parse(response.payload);
		expect(Array.isArray(data)).toBe(true);
		expect(total).toBe(3);
		expect(page).toBe(1);
		expect(limit).toBe(10);
		data.forEach((configTemplate: any) => {
			expect(configTemplate.isPredefined).toBeUndefined();
		});
	});
});

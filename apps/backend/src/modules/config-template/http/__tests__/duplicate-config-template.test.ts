import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import { faker } from '@faker-js/faker';
import type { FastifyInstance } from 'fastify';
import {
	QrCodeDefaults,
	type TConfigTemplateResponseDto,
	type TCreateConfigTemplateDto,
} from '@shared/schemas';

const CONFIG_TEMPLATE_API_PATH = `${API_BASE_PATH}/config-template`;
const TEST_BASE64_IMAGE =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const generateConfigTemplateDto = (): TCreateConfigTemplateDto => ({
	name: faker.lorem.words(3).substring(0, 50),
	config: QrCodeDefaults,
});

describe('duplicateConfigTemplate', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	const createTemplateRequest = async (payload: object, token: string) =>
		testServer.inject({
			method: 'POST',
			url: CONFIG_TEMPLATE_API_PATH,
			payload,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});

	const duplicateRequest = async (templateId: string, token?: string) =>
		testServer.inject({
			method: 'POST',
			url: `${CONFIG_TEMPLATE_API_PATH}/${templateId}/duplicate`,
			headers: {
				...(token && { Authorization: `Bearer ${token}` }),
			},
		});

	it('should duplicate a config template and return 201', async () => {
		const dto = generateConfigTemplateDto();
		const createResponse = await createTemplateRequest(dto, accessToken);
		expect(createResponse).toHaveStatusCode(201);
		const source = JSON.parse(createResponse.payload) as TConfigTemplateResponseDto;

		const response = await duplicateRequest(source.id, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TConfigTemplateResponseDto;
		expect(duplicate.id).not.toBe(source.id);
		expect(duplicate.config).toEqual(source.config);
		expect(duplicate.name).toBe(`(Copy) ${source.name}`);
	});

	it('should truncate name when original is at max length', async () => {
		const dto = generateConfigTemplateDto();
		dto.name = 'A'.repeat(50);
		const createResponse = await createTemplateRequest(dto, accessToken);
		expect(createResponse).toHaveStatusCode(201);
		const source = JSON.parse(createResponse.payload) as TConfigTemplateResponseDto;

		const response = await duplicateRequest(source.id, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TConfigTemplateResponseDto;
		expect(duplicate.name).toHaveLength(50);
		expect(duplicate.name.startsWith('(Copy) ')).toBe(true);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await duplicateRequest('some-id');
		expect(response).toHaveStatusCode(401);
	});

	it('should return 404 for non-existent template', async () => {
		const response = await duplicateRequest('non-existent-id', accessToken);
		expect(response).toHaveStatusCode(404);
	});

	it('should copy the embedded image to the config-template upload folder', async () => {
		const dto: TCreateConfigTemplateDto = {
			...generateConfigTemplateDto(),
			config: { ...QrCodeDefaults, image: TEST_BASE64_IMAGE },
		};
		const createResponse = await createTemplateRequest(dto, accessToken);
		expect(createResponse).toHaveStatusCode(201);
		const source = JSON.parse(createResponse.payload) as TConfigTemplateResponseDto;
		expect(source.config.image).toBeTruthy();
		expect(source.config.image).not.toContain('base64');

		const response = await duplicateRequest(source.id, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TConfigTemplateResponseDto;
		const duplicatedImage = duplicate.config.image!;
		expect(duplicatedImage).toBeTruthy();
		expect(duplicatedImage).not.toContain('base64');
		expect(duplicatedImage).not.toBe(source.config.image);
		expect(duplicatedImage).toContain('config-templates/images/uploads/');
		expect(duplicatedImage).not.toContain('qr-codes/');
	});

	it("should return 403 when duplicating another user's template", async () => {
		const dto = generateConfigTemplateDto();
		const createResponse = await createTemplateRequest(dto, accessToken);
		expect(createResponse).toHaveStatusCode(201);
		const source = JSON.parse(createResponse.payload) as TConfigTemplateResponseDto;

		const response = await duplicateRequest(source.id, accessToken2);
		expect(response).toHaveStatusCode(403);
	});
});

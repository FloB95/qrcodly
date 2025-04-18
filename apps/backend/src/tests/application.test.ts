import { type FastifyInstance } from 'fastify';
import { API_BASE_PATH } from '@/core/config/constants';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';

/**
 * Create User API Tests
 */
describe('test application', () => {
	let testServer: FastifyInstance;

	beforeAll(async () => {
		({ testServer } = await getTestServerWithUserAuth());
	});

	afterAll(async () => {
		await shutDownServer();
	});

	it('should start the server and make a healthcheck', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${API_BASE_PATH}/`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			status: 'ok',
		});
	});
});

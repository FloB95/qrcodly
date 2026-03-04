import { type FastifyInstance } from 'fastify';
import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext } from '@/tests/shared/test-context';

/**
 * Create User API Tests
 */
describe('test application', () => {
	let testServer: FastifyInstance;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
	});

	it('should start the server and make a healthcheck', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${API_BASE_PATH}`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			status: 'ok',
		});
	});
});

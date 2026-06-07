import { container } from 'tsyringe';
import { type FastifyInstance } from 'fastify';
import { getTestContext, TEST_USER_ID } from '@/tests/shared/test-context';
import { API_BASE_PATH } from '@/core/config/constants';
import { KeyCache } from '@/core/cache';

/**
 * Custom user-ban enforcement in addUserToRequestMiddleware. The middleware
 * consults `user_ban:<userId>` in Redis first, so seeding that key lets us drive
 * the banned/not-banned paths deterministically without mutating Clerk.
 */
describe('custom user-ban enforcement (middleware)', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let cache: KeyCache;
	const banKey = `user_ban:${TEST_USER_ID}`;
	const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken; // session token for TEST_USER_ID
		cache = container.resolve(KeyCache);
	});

	afterEach(async () => {
		await cache.del(banKey);
	});

	it('rejects a banned user with 403 ACCOUNT_BANNED', async () => {
		await cache.set(banKey, 1, 60);

		const response = await testServer.inject({
			method: 'GET',
			url: QR_CODE_API_PATH,
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({ errorCode: 'ACCOUNT_BANNED', code: 403 });
	});

	it('lets a non-banned user through (cached not-banned flag)', async () => {
		await cache.set(banKey, 0, 60);

		const response = await testServer.inject({
			method: 'GET',
			url: QR_CODE_API_PATH,
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		expect(response.statusCode).toBe(200);
	});
});

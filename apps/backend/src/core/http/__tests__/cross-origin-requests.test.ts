import { getTestContext } from '@/tests/shared/test-context';
import { API_BASE_PATH } from '@/core/config/constants';
import { API_CLIENT_HEADER } from '@shared/schemas';
import type { FastifyInstance } from 'fastify';

/**
 * The API is open to every origin and authenticates by the Authorization header alone. Whatever a
 * browser attaches on its own — cookies, credentialed CORS — must never grant access.
 */
describe('cross-origin requests', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	const url = `${API_BASE_PATH}/qr-code?page=1&limit=10`;

	const origins = [
		['a third-party web app', 'https://third-party.example'],
		['an opaque origin such as the Figma plugin', 'null'],
		['the web app', 'https://www.qrcodly.de'],
		['the Chrome extension', 'chrome-extension://pagnaengchnbgecnappokojmdnagefpd'],
	];

	beforeAll(async () => {
		({ testServer, accessToken } = await getTestContext());
	});

	describe('CORS', () => {
		const preflight = (origin: string) =>
			testServer.inject({
				method: 'OPTIONS',
				url,
				headers: {
					origin,
					'access-control-request-method': 'POST',
					'access-control-request-headers': 'authorization,content-type,x-qrcodly-client',
				},
			});

		it.each(origins)('lets %s send a bearer token', async (_label, origin) => {
			const response = await preflight(origin);

			expect(response.statusCode).toBe(204);
			expect(response.headers['access-control-allow-origin']).toBe(origin);
			for (const header of ['Authorization', 'Content-Type', API_CLIENT_HEADER]) {
				expect(response.headers['access-control-allow-headers']).toEqual(
					expect.stringContaining(header),
				);
			}
		});

		it.each(origins)('grants %s no credentialed requests', async (_label, origin) => {
			const response = await preflight(origin);

			expect(response.headers['access-control-allow-credentials']).toBeUndefined();
		});

		it('answers a bearer request from a third-party origin', async () => {
			const response = await testServer.inject({
				method: 'GET',
				url,
				headers: { origin: 'https://third-party.example', authorization: `Bearer ${accessToken}` },
			});

			expect(response.statusCode).toBe(200);
			expect(response.headers['access-control-allow-origin']).toBe('https://third-party.example');
			expect(response.headers['access-control-allow-credentials']).toBeUndefined();
		});
	});

	describe('cookies', () => {
		// Clerk's development instance additionally wants its dev-browser cookie before it reads the
		// session cookie; production only needs the first two.
		const clerkCookies = () => `__session=${accessToken}; __client_uat=1; __clerk_db_jwt=dvb_test`;

		it('ignores a valid Clerk session cookie', async () => {
			const response = await testServer.inject({
				method: 'GET',
				url,
				headers: { origin: 'https://third-party.example', cookie: clerkCookies() },
			});

			expect(response.statusCode).toBe(401);
		});

		it('still accepts the bearer token when the browser sends Clerk cookies along', async () => {
			const response = await testServer.inject({
				method: 'GET',
				url,
				headers: { authorization: `Bearer ${accessToken}`, cookie: clerkCookies() },
			});

			expect(response.statusCode).toBe(200);
		});
	});
});

import { getTestContext } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';

/**
 * Regression coverage for the InDesign plugin incident: a stored credential that was not an API
 * key made every endpoint answer 400 "Malformed or unsupported request body". Clerk decodes
 * anything JWT-shaped before validating it, so a value with two dots escapes its base64/JSON
 * decoding as a bare SyntaxError. A bad credential must read as 401, whatever its shape.
 */
describe('malformed bearer tokens', () => {
	let testServer: FastifyInstance;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
	});

	const request = (token: string, url = '/api/v1/qr-code?page=1&limit=20') =>
		testServer.inject({
			method: 'GET',
			url,
			headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		});

	describe('JWT-shaped values that are not tokens', () => {
		it.each([
			['a pasted URL', 'https://api.qrcodly.de/ak_abc'],
			['a pasted dashboard URL', 'https://qrcodly.de/dashboard/settings'],
			['a JWT shape with an unparseable payload', 'eyJhbGciOiJIUzI1NiJ9.eyJhOjF9.sig'],
			['a JWT shape with non-base64 segments', 'not.a.jwt'],
			['a bare host name', 'api.qrcodly.de'],
		])('answers 401 for %s', async (_label, token) => {
			const response = await request(token);

			expect(response.statusCode).toBe(401);
		});

		it('does not blame the request body — that sent a real user hunting the wrong bug', async () => {
			const response = await request('https://api.qrcodly.de/ak_abc');

			expect(response.payload).not.toContain('body');
			expect(response.payload).not.toContain('Invalid character');
			expect(JSON.parse(response.payload)).toEqual({
				message: 'The provided token is malformed',
				code: 401,
			});
		});

		it('holds on the tag endpoint too, since the fault is in the shared auth hook', async () => {
			const response = await request(
				'https://api.qrcodly.de/ak_abc',
				'/api/v1/tag?page=1&limit=100',
			);

			expect(response.statusCode).toBe(401);
		});
	});

	describe('credentials that were already rejected correctly', () => {
		it.each([
			['a plain wrong key', 'ak_abc123'],
			['a key with a colon', 'ak_test:123'],
			['a value pasted with its label', 'Secret: ak_abc123'],
			['an empty token', ''],
		])('still answers 401 for %s', async (_label, token) => {
			const response = await request(token);

			expect(response.statusCode).toBe(401);
		});
	});
});

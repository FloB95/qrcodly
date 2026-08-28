import { container } from 'tsyringe';
import type { FastifyInstance } from 'fastify';
import { getTestContext } from '@/tests/shared/test-context';
import { Logger } from '@/core/logging';
import { ErrorReporter } from '@/core/error';

/**
 * Regression coverage for the request shape internet background scanners fire at the API:
 * a POST with a `multipart/form-data` content type whose body does not match the declared
 * boundary. `@fastify/multipart` parses the body before routing can answer 404, busboy
 * rejects it with a bare Error, and that used to surface as an unhandled 500.
 */
describe('fastifyErrorHandler', () => {
	let testServer: FastifyInstance;
	let logger: Logger;
	let errorSpy: jest.SpyInstance;
	let warnSpy: jest.SpyInstance;
	let reportSpy: jest.SpyInstance;

	const BODY_BOUNDARY = '----WebKitFormBoundaryScannerProbe';
	const multipartBody =
		`--${BODY_BOUNDARY}\r\nContent-Disposition: form-data; name="1_$ACTION_ID"\r\n\r\n` +
		`probe\r\n--${BODY_BOUNDARY}--\r\n`;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		logger = container.resolve(Logger);
	});

	beforeEach(() => {
		errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
		warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
		reportSpy = jest
			.spyOn(container.resolve(ErrorReporter), 'error')
			.mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	const probe = (path: string, contentType: string, payload: string) =>
		testServer.inject({
			method: 'POST',
			url: path,
			headers: {
				'content-type': contentType,
				accept: 'text/x-component,*/*',
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
			},
			payload,
		});

	describe('malformed multipart bodies', () => {
		it.each(['/', '/auth/callback', '/signin', '/admin'])(
			'answers 400 instead of 500 when the boundary does not match the body (%s)',
			async (path) => {
				const response = await probe(path, 'multipart/form-data; boundary=MISMATCH', multipartBody);

				expect(response.statusCode).toBe(400);
			},
		);

		it('answers 400 when the content type carries no boundary at all', async () => {
			const response = await probe('/', 'multipart/form-data', multipartBody);

			expect(response.statusCode).toBe(400);
		});

		it('logs the fault at warn level, never at error level', async () => {
			await probe('/', 'multipart/form-data; boundary=MISMATCH', multipartBody);

			expect(errorSpy).not.toHaveBeenCalled();
			expect(warnSpy).toHaveBeenCalledWith(
				'CustomApiError',
				expect.objectContaining({
					error: expect.objectContaining({ statusCode: 400 }),
				}),
			);
		});

		it('does not report the fault to Sentry', async () => {
			await probe('/', 'multipart/form-data; boundary=MISMATCH', multipartBody);

			expect(reportSpy).not.toHaveBeenCalled();
		});

		it('records the request path so scanner traffic stays traceable', async () => {
			await probe('/auth/callback', 'multipart/form-data; boundary=MISMATCH', multipartBody);

			expect(warnSpy).toHaveBeenCalledWith(
				'CustomApiError',
				expect.objectContaining({
					request: expect.objectContaining({ path: '/auth/callback', method: 'POST' }),
				}),
			);
		});
	});

	describe('well-formed bodies on unknown routes', () => {
		it('still answers 404 for a parseable multipart body', async () => {
			const response = await probe(
				'/auth/callback',
				`multipart/form-data; boundary=${BODY_BOUNDARY}`,
				multipartBody,
			);

			expect(response.statusCode).toBe(404);
			expect(errorSpy).not.toHaveBeenCalled();
		});

		it('answers 404 for a plain GET on an unknown route', async () => {
			const response = await testServer.inject({ method: 'GET', url: '/dashboard' });

			expect(response.statusCode).toBe(404);
			expect(errorSpy).not.toHaveBeenCalled();
		});
	});

	describe('broken JSON bodies', () => {
		it('answers 400 and logs at warn level', async () => {
			const response = await testServer.inject({
				method: 'POST',
				url: '/api/v1/qr-code',
				headers: { 'content-type': 'application/json' },
				payload: '{"content": ',
			});

			expect(response.statusCode).toBe(400);
			expect(errorSpy).not.toHaveBeenCalled();
		});
	});

	describe('client faults on real routes', () => {
		it('logs a 401 at warn level rather than error level', async () => {
			const response = await testServer.inject({ method: 'GET', url: '/api/v1/qr-code' });

			expect(response.statusCode).toBe(401);
			expect(errorSpy).not.toHaveBeenCalled();
			expect(warnSpy).toHaveBeenCalledWith(
				'CustomApiError',
				expect.objectContaining({
					error: expect.objectContaining({ type: 'UnauthorizedError', statusCode: 401 }),
				}),
			);
			expect(reportSpy).not.toHaveBeenCalled();
		});
	});
});

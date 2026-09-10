import { container } from 'tsyringe';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { fastifyErrorHandler } from '../helpers';
import { Logger } from '@/core/logging';
import { ErrorReporter } from '@/core/error';
import { IpAbuseTrackerService } from '@/core/ip-protection';
import {
	BadRequestError,
	NotFoundError,
	ServiceUnavailableError,
	UnauthorizedError,
} from '@/core/error/http';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';

describe('fastifyErrorHandler log levels', () => {
	let errorSpy: jest.SpyInstance;
	let warnSpy: jest.SpyInstance;
	let reportSpy: jest.SpyInstance;
	let send: jest.Mock;
	let reply: FastifyReply;

	const request = {
		id: 'req-test',
		clientIp: '203.0.113.10',
		method: 'POST',
		url: '/api/v1/qr-code',
		headers: { host: 'api.qrcodly.de' },
	} as unknown as FastifyRequest;

	beforeEach(() => {
		const logger = container.resolve(Logger);
		errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
		warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
		reportSpy = jest
			.spyOn(container.resolve(ErrorReporter), 'error')
			.mockImplementation(() => undefined);

		send = jest.fn();
		reply = { status: jest.fn().mockReturnValue({ send }) } as unknown as FastifyReply;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('client faults (4xx)', () => {
		it.each([
			['BadRequestError', new BadRequestError('nope'), 400],
			['NotFoundError', new NotFoundError('gone'), 404],
		])('logs %s at warn level and keeps it out of Sentry', (_label, error, statusCode) => {
			fastifyErrorHandler(error, request, reply);

			expect(errorSpy).not.toHaveBeenCalled();
			expect(reportSpy).not.toHaveBeenCalled();
			expect(warnSpy).toHaveBeenCalledWith(
				'CustomApiError',
				expect.objectContaining({
					error: expect.objectContaining({ statusCode }),
				}),
			);
			expect(reply.status).toHaveBeenCalledWith(statusCode);
		});

		it('does not attach the raw error, which would drag a stack into a non-incident', () => {
			fastifyErrorHandler(new NotFoundError('gone'), request, reply);

			expect(warnSpy.mock.calls[0][1]).not.toHaveProperty('err');
		});
	});

	describe('server faults (5xx)', () => {
		it('logs an UnhandledServerError at error level exactly once', () => {
			const cause = new Error('Database connection lost');

			fastifyErrorHandler(new UnhandledServerError(cause), request, reply);

			expect(warnSpy).not.toHaveBeenCalled();
			expect(errorSpy).toHaveBeenCalledTimes(1);
			expect(reply.status).toHaveBeenCalledWith(500);
		});

		it('reports the original error to Sentry exactly once, not the wrapper', () => {
			const cause = new Error('Database connection lost');

			fastifyErrorHandler(
				new UnhandledServerError(cause, 'QR code creation transaction failed.'),
				request,
				reply,
			);

			expect(reportSpy).toHaveBeenCalledTimes(1);
			expect(reportSpy).toHaveBeenCalledWith(cause, { level: 'error' });
		});

		it('keeps the original throw site under `err` so the stack survives', () => {
			const cause = new Error('Database connection lost');

			fastifyErrorHandler(new UnhandledServerError(cause), request, reply);

			expect(errorSpy).toHaveBeenCalledWith(
				'CustomApiError',
				expect.objectContaining({
					err: cause,
					error: expect.objectContaining({
						type: 'UnhandledServerError',
						statusCode: 500,
					}),
				}),
			);
		});

		it('still logs an unrecognised error at error level and reports it', () => {
			const error = new Error('something nobody anticipated');

			fastifyErrorHandler(error, request, reply);

			expect(warnSpy).not.toHaveBeenCalled();
			expect(errorSpy).toHaveBeenCalledWith('Unhandled Server error', expect.anything());
			expect(reportSpy).toHaveBeenCalledWith(error, { level: 'error' });
			expect(reply.status).toHaveBeenCalledWith(500);
		});
	});

	describe('malformed bodies reaching the handler', () => {
		it('answers 400 and stays out of the error level', () => {
			fastifyErrorHandler(new Error('Unexpected end of multipart data'), request, reply);

			expect(errorSpy).not.toHaveBeenCalled();
			expect(reportSpy).not.toHaveBeenCalled();
			expect(reply.status).toHaveBeenCalledWith(400);
			expect(send).toHaveBeenCalledWith({
				message: 'Malformed or unsupported request body.',
				code: 400,
			});
		});

		it('never echoes the internal parser message back to the caller', () => {
			fastifyErrorHandler(new Error('Multipart: Boundary not found'), request, reply);

			const body = JSON.stringify(send.mock.calls[0][0]);
			expect(body).not.toContain('Boundary not found');
			expect(body).not.toContain('Multipart');
		});

		it('preserves a framework status such as 413 rather than flattening to 400', () => {
			const error = Object.assign(new Error('Request body is too large'), {
				code: 'FST_ERR_CTP_BODY_TOO_LARGE',
				statusCode: 413,
			});

			fastifyErrorHandler(error, request, reply);

			expect(reply.status).toHaveBeenCalledWith(413);
			expect(errorSpy).not.toHaveBeenCalled();
		});
	});
});

describe('fastifyErrorHandler response leakage', () => {
	let send: jest.Mock;
	let reply: FastifyReply;

	const request = {
		id: 'req-test',
		clientIp: '203.0.113.10',
		method: 'POST',
		url: '/',
		headers: { host: 'api.qrcodly.de' },
	} as unknown as FastifyRequest;

	beforeEach(() => {
		jest.spyOn(container.resolve(Logger), 'error').mockImplementation(() => undefined);
		jest.spyOn(container.resolve(Logger), 'warn').mockImplementation(() => undefined);
		jest.spyOn(container.resolve(ErrorReporter), 'error').mockImplementation(() => undefined);

		send = jest.fn();
		reply = { status: jest.fn().mockReturnValue({ send }) } as unknown as FastifyReply;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	const responseBodyFor = (error: Error) => {
		fastifyErrorHandler(error, request, reply);
		return send.mock.calls[0][0] as Record<string, unknown>;
	};

	it.each([
		['a bare server fault', new Error('connect ECONNREFUSED 10.0.0.5:3306')],
		[
			'a wrapped server fault',
			new UnhandledServerError(
				new Error('Table qrcodly.qr_code does not exist'),
				'QR code creation transaction failed.',
			),
		],
	])('answers %s with nothing but a generic message and code', (_label, error) => {
		expect(responseBodyFor(error)).toEqual({
			message: 'An unexpected error occurred.',
			code: 500,
		});
	});

	it.each([
		['host names', new Error('connect ECONNREFUSED 10.0.0.5:3306')],
		['sql', new Error('Table qrcodly.qr_code does not exist')],
		['file paths', new Error('ENOENT: /Users/flo/Projects/own/qrcodly/apps/backend/src/x.ts')],
		['secrets', new Error('Invalid token sk_live_abc123')],
	])('does not let %s reach the caller on a server fault', (_label, error) => {
		expect(JSON.stringify(responseBodyFor(error))).toBe(
			JSON.stringify({ message: 'An unexpected error occurred.', code: 500 }),
		);
	});

	it('never returns a stack trace, whatever the fault', () => {
		for (const error of [
			new Error('boom'),
			new UnhandledServerError(new Error('boom')),
			new Error('Unexpected end of multipart data'),
			new SyntaxError('Unexpected token } in JSON at position 12'),
		]) {
			send.mockClear();
			fastifyErrorHandler(error, request, reply);

			const body = JSON.stringify(send.mock.calls[0][0]);
			expect(body).not.toContain('stack');
			expect(body).not.toContain('at Object');
			expect(Object.keys(send.mock.calls[0][0] as object).sort()).toEqual(['code', 'message']);
		}
	});

	it('keeps the curated wording of a deliberate 5xx', () => {
		const body = responseBodyFor(
			new ServiceUnavailableError(
				'Domain verification is temporarily unavailable. Please try again in a few minutes.',
			),
		);

		expect(body.message).toBe(
			'Domain verification is temporarily unavailable. Please try again in a few minutes.',
		);
		expect(body.code).toBe(503);
	});

	it('does not echo the V8 parser detail of a broken JSON body', () => {
		const body = responseBodyFor(new SyntaxError('Unexpected token } in JSON at position 12'));

		expect(body.message).toBe('Malformed or unsupported request body.');
		expect(JSON.stringify(body)).not.toContain('position 12');
	});
});

describe('fastifyErrorHandler token decode faults', () => {
	let errorSpy: jest.SpyInstance;
	let warnSpy: jest.SpyInstance;
	let reportSpy: jest.SpyInstance;
	let trackSpy: jest.SpyInstance;
	let send: jest.Mock;
	let reply: FastifyReply;

	const request = {
		id: 'req-test',
		clientIp: '203.0.113.10',
		method: 'GET',
		url: '/api/v1/qr-code?page=1&limit=20',
		headers: { host: 'api.qrcodly.de' },
	} as unknown as FastifyRequest;

	/** A SyntaxError whose stack points into @clerk/backend, like Clerk's decode throws. */
	const clerkDecodeError = (message: string, frame: string) => {
		const error = new SyntaxError(message);
		error.stack = `SyntaxError: ${message}\n    at parse (${frame})`;
		return error;
	};

	const PNPM_FRAME =
		'/app/node_modules/.pnpm/@clerk+backend@3.11.6/node_modules/@clerk/backend/dist/util/rfc4648.js:78:13';
	const POSIX_FRAME = '/app/node_modules/@clerk/backend/dist/jwt/verifyJwt.js:83:24';
	const WINDOWS_FRAME = 'C:\\app\\node_modules\\@clerk\\backend\\dist\\util\\rfc4648.js:78:13';

	beforeEach(() => {
		const logger = container.resolve(Logger);
		errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
		warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
		reportSpy = jest
			.spyOn(container.resolve(ErrorReporter), 'error')
			.mockImplementation(() => undefined);
		trackSpy = jest
			.spyOn(container.resolve(IpAbuseTrackerService), 'trackUnauthorizedAttempt')
			.mockResolvedValue(undefined);

		send = jest.fn();
		reply = { status: jest.fn().mockReturnValue({ send }) } as unknown as FastifyReply;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it.each([
		['a pnpm store path', PNPM_FRAME],
		['a plain node_modules path', POSIX_FRAME],
		['a windows path', WINDOWS_FRAME],
	])('answers 401 when the stack shows %s', (_label, frame) => {
		fastifyErrorHandler(clerkDecodeError('Invalid character :', frame), request, reply);

		expect(reply.status).toHaveBeenCalledWith(401);
		expect(send).toHaveBeenCalledWith({
			message: 'The provided token is malformed',
			code: 401,
		});
	});

	it('keeps the decode detail in the log — it was the only forensic clue in the incident', () => {
		fastifyErrorHandler(clerkDecodeError('Invalid character :', PNPM_FRAME), request, reply);

		expect(warnSpy).toHaveBeenCalledWith(
			'CustomApiError',
			expect.objectContaining({
				error: expect.objectContaining({
					type: 'UnauthorizedError',
					statusCode: 401,
					cause: 'Invalid character :',
				}),
			}),
		);
		expect(errorSpy).not.toHaveBeenCalled();
		expect(reportSpy).not.toHaveBeenCalled();
	});

	it('does not count the sender toward the IP abuse block — a broken stored key retries forever', () => {
		fastifyErrorHandler(clerkDecodeError('Invalid character :', PNPM_FRAME), request, reply);

		expect(trackSpy).not.toHaveBeenCalled();
	});

	it('still tracks a genuine wrong-credential 401', () => {
		fastifyErrorHandler(new UnauthorizedError(), request, reply);

		expect(trackSpy).toHaveBeenCalledWith('203.0.113.10');
	});

	it('leaves a SyntaxError from outside Clerk on the malformed-body 400 path', () => {
		const error = new SyntaxError('Unexpected token } in JSON at position 12');
		error.stack = 'SyntaxError: Unexpected token\n    at JSON.parse (<anonymous>)';

		fastifyErrorHandler(error, request, reply);

		expect(reply.status).toHaveBeenCalledWith(400);
		expect(trackSpy).not.toHaveBeenCalled();
	});
});

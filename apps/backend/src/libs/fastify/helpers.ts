import crypto from 'node:crypto';
import {
	type FastifyInstance,
	type RegisterOptions,
	type FastifyPluginOptions,
	type FastifyReply,
	type FastifyRequest,
	type RouteOptions,
} from 'fastify';
import { env } from '@/core/config/env';
import { deepMerge, mergeZodErrorObjects } from '@/utils/general';
import {
	AccountBannedError,
	BadRequestError,
	CustomApiError,
	InsufficientScopeError,
	TokenTypeNotAllowedError,
	UnauthorizedError,
} from '@/core/error/http';
import { container, type InjectionToken } from 'tsyringe';
import { Logger } from '@/core/logging';
import { ErrorReporter } from '@/core/error';
import { IpAbuseTrackerService } from '@/core/ip-protection';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { ROUTE_METADATA_KEY, type RouteMetadata } from '@/core/decorators/route';
import { type IHttpResponse } from '@/core/interface/response.interface';
import type AbstractController from '@/core/http/controller/abstract.controller';
import { defaultApiAuthMiddleware } from '@/core/http/middleware/default-api-auth.middleware';
import { enforceScope } from '@/core/http/middleware/enforce-scope.middleware';
import { enforceTokenType } from '@/core/http/middleware/enforce-token-type.middleware';
import { type ApiKeyScope } from '@shared/schemas';
import z, { type ZodType } from 'zod';
import qs from 'qs';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';
import { $ZodError } from 'zod/v4/core';

export const fastifyRequestParser = <T extends IHttpRequest>(
	request: FastifyRequest & { user?: { id: string } },
): T => {
	const { cookies } = request;
	for (const key in cookies) {
		if (cookies[key]) {
			const c = request.unsignCookie(cookies[key]);
			cookies[key] = c.value ?? undefined;
		}
	}

	return Object.freeze({ ...request, cookies, headers: request.headers }) as T;
};

/**
 * Bare `Error`s that `@fastify/multipart`/busboy throws when a request body cannot be parsed.
 * Internet background scanners produce these constantly (they fire a fixed multipart payload
 * at every host), and unmapped they get counted as unhandled 500s.
 */
const MALFORMED_BODY_MESSAGES = [
	'Multipart: Boundary not found',
	'Unexpected end of multipart data',
	'Unexpected end of form',
	'Malformed part header',
];

/**
 * Resolves the status code for a non-`CustomApiError` that is the client's fault, or null when
 * the fault is ours. Body parsing runs before routing, so these never reach a route handler.
 */
export const resolveClientFaultStatus = (error: Error): number | null => {
	if (error.name === 'SyntaxError') return 400;

	const statusCode = (error as { statusCode?: unknown }).statusCode;
	if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
		return statusCode;
	}

	return MALFORMED_BODY_MESSAGES.some((message) => error.message.startsWith(message)) ? 400 : null;
};

/**
 * Clerk's own `preHandler` hook decodes a Bearer token before it validates it, and that decoding
 * throws bare `SyntaxError`s — `@clerk/backend/util/rfc4648` on a non-base64 segment, `JSON.parse`
 * in `jwt/verifyJwt` on an unparseable payload. Any value with two dots is JWT-shaped enough to
 * reach it, a pasted URL included. The errors escape Clerk's hook, so without this they land in
 * the malformed-body branch below and every endpoint answers 400 about the request body — which
 * is how a bad API key in the InDesign plugin looked like a server-side payload bug.
 */
const isTokenDecodeError = (error: Error): boolean =>
	error instanceof SyntaxError && /@clerk[+/\\]backend/.test(error.stack ?? '');

/**
 * The wrapped original's message, kept in the log for diagnosis — it was the only clue in the
 * InDesign incident. Truncated because Node's JSON.parse embeds decoded input in its messages.
 */
const causeMessageOf = (error: Error): string | undefined => {
	const cause = (error as { cause?: unknown }).cause;
	return cause instanceof Error ? cause.message.slice(0, 120) : undefined;
};

export const fastifyErrorHandler = (
	rawError: Error,
	_request: FastifyRequest,
	reply: FastifyReply,
) => {
	const logger = container.resolve(Logger);
	const tokenDecodeFault = isTokenDecodeError(rawError);
	const error = tokenDecodeFault
		? Object.assign(new UnauthorizedError('The provided token is malformed'), { cause: rawError })
		: rawError;

	if (error instanceof CustomApiError) {
		const responsePayload: any = {
			message: error.message,
			code: error.statusCode,
		};

		// An UnhandledServerError wraps an unexpected internal failure — its message ("QR code
		// creation transaction failed.") is context for us, not for the caller. Deliberate 5xx
		// such as ServiceUnavailableError keep their curated wording.
		if (error instanceof UnhandledServerError) {
			responsePayload.message = 'An unexpected error occurred.';
		}

		// Expose a machine-readable errorCode for any error that defines one (frontend mapping).
		const maybeErrorCode = (error as { errorCode?: unknown }).errorCode;
		if (typeof maybeErrorCode === 'string') {
			responsePayload.errorCode = maybeErrorCode;
		}

		if (error instanceof BadRequestError && error.zodError) {
			const mergedErrors = mergeZodErrorObjects(error.zodError.issues);
			responsePayload.fieldErrors = mergedErrors;
		}

		if (error instanceof AccountBannedError) {
			responsePayload.errorCode = error.errorCode;
		}

		if (error instanceof InsufficientScopeError) {
			responsePayload.errorCode = error.errorCode;
			responsePayload.requiredScope = error.requiredScope;
			responsePayload.grantedScopes = error.grantedScopes;
		}

		if (error instanceof TokenTypeNotAllowedError) {
			responsePayload.errorCode = error.errorCode;
			responsePayload.providedTokenType = error.providedTokenType;
			responsePayload.allowedTokenTypes = error.allowedTokenTypes;
		}

		// 4xx means the caller got it wrong, 5xx means we did. Only the latter is an incident,
		// so only the latter is logged at error level and reported to Sentry.
		const isServerFault = error.statusCode >= 500;
		const cause = error instanceof UnhandledServerError ? error.originalError : error;

		logger[isServerFault ? 'error' : 'warn']('CustomApiError', {
			request: createRequestLogObject(_request),
			error: {
				type: error.constructor.name,
				message: error.message,
				statusCode: error.statusCode,
				cause: causeMessageOf(error),
				userId: error instanceof AccountBannedError ? error.userId : undefined,
				zodErrors: (error as BadRequestError)?.zodError
					? (error as BadRequestError)?.zodError?.issues
					: undefined,
			},
			// Server faults carry the original throw site under `err`, where pino's built-in
			// serializer keeps the stack.
			...(isServerFault ? { err: cause } : {}),
		});

		if (isServerFault) {
			container.resolve(ErrorReporter).error(cause, { level: 'error' });
		}

		// A malformed token can never brute-force anything, and its sender is more often a customer
		// with a broken stored credential than an attacker — retrying in the background it would walk
		// straight into the 7-day IP block. Guessing attempts arrive as well-formed keys and stay
		// tracked.
		if (error instanceof UnauthorizedError && !tokenDecodeFault) {
			container
				.resolve(IpAbuseTrackerService)
				.trackUnauthorizedAttempt(_request.clientIp)
				.catch((err) => logger.error('ip.abuse.tracking.error', { error: err as Error }));
		}

		return reply.status(error.statusCode).send(responsePayload);
	}

	const clientFaultStatus = resolveClientFaultStatus(error);
	if (clientFaultStatus !== null) {
		logger.warn('CustomApiError', {
			request: createRequestLogObject(_request),
			error: {
				type: error.constructor.name,
				message: error.message,
				statusCode: clientFaultStatus,
			},
		});

		// Deliberately generic: these messages come from busboy and Fastify internals, so
		// echoing them back would hand scanners a fingerprint of the stack. The real message
		// stays in the log above.
		return reply
			.status(clientFaultStatus)
			.send({ message: 'Malformed or unsupported request body.', code: clientFaultStatus });
	}

	logger.error(`Unhandled Server error`, {
		request: createRequestLogObject(_request),
		error,
	});

	container.resolve(ErrorReporter).error(error, {
		level: 'error',
	});

	return reply.status(500).send({
		message: 'An unexpected error occurred.',
		code: 500,
	});
};

export const getOptionsWithPrefix = (options: FastifyPluginOptions, prefix: string) => {
	return {
		...options,
		prefix: options.prefix + prefix,
	};
};

const handleFastifyRequest = async (
	handler: (request: IHttpRequest) => Promise<IHttpResponse>,
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> => {
	try {
		const res = await handler(fastifyRequestParser(request));
		reply.statusCode = res.statusCode;
		void reply.headers(res.headers);
		void reply.send(res.data);
	} catch (e) {
		const error = e as Error;
		if (error instanceof CustomApiError) {
			throw error;
		}

		if (error instanceof $ZodError) {
			throw new BadRequestError(error.message, error);
		}

		throw new UnhandledServerError(error);
	}
};

function parseJsonFields(body: Record<string, any>, fieldsToParse: string[] = ['config']) {
	const parsedBody: Record<string, any> = { ...body };

	for (const key of fieldsToParse) {
		if (parsedBody[key] && typeof parsedBody[key] === 'string') {
			try {
				parsedBody[key] = JSON.parse(parsedBody[key]);
			} catch (e: any) {
				throw new BadRequestError(`Invalid JSON in field "${key}": ${e.message}`);
			}
		}
	}

	return parsedBody;
}

/**
 * Default API-key scope per HTTP method. Null for OPTIONS (CORS preflights, no auth).
 * Exported so the scope-coverage matrix test can assert the same mapping.
 */
export function resolveScopeForMethod(method: string): ApiKeyScope | null {
	switch (method.toUpperCase()) {
		case 'GET':
		case 'HEAD':
			return 'read';
		case 'POST':
			return 'write';
		case 'PUT':
		case 'PATCH':
			return 'update';
		case 'DELETE':
			return 'delete';
		default:
			return null;
	}
}

export function registerRoutes(
	fastify: FastifyInstance,
	ControllerClass: unknown,
	prefix = '',
	fastifyOptions?: RegisterOptions,
): void {
	const routesMetadata = Reflect.getMetadata(
		ROUTE_METADATA_KEY,
		ControllerClass as new (...args: unknown[]) => AbstractController,
	) as RouteMetadata[];

	if (!routesMetadata) {
		return;
	}

	const logger = container.resolve(Logger);

	routesMetadata.forEach((routeMeta) => {
		const controllerInstance = container.resolve(
			ControllerClass as InjectionToken<AbstractController>,
		);
		const handler = controllerInstance[routeMeta.handlerName as keyof AbstractController];

		if (typeof handler !== 'function') {
			logger.warn(
				`Handler "${routeMeta.handlerName}" not found on controller "${(ControllerClass as new (...args: unknown[]) => AbstractController).name}"`,
			);
			return;
		}

		const fullPath = (fastifyOptions?.prefix ?? '') + prefix + routeMeta.path;
		logger.debug(`Registering route METHOD: ${routeMeta.method} PATH: ${fullPath}`);

		const schema: Record<string, unknown> = { ...(routeMeta.options.schema ?? {}) };

		if (routeMeta.options.bodySchema) {
			schema.body = z.toJSONSchema(routeMeta.options.bodySchema, {
				target: 'openapi-3.0',
				unrepresentable: 'any',
			});
		}

		if (routeMeta.options.querySchema) {
			schema.querystring = z.toJSONSchema(routeMeta.options.querySchema, {
				target: 'openapi-3.0',
				unrepresentable: 'any',
			});
		}

		if (routeMeta.options.responseSchema) {
			schema.response = Object.fromEntries(
				Object.entries(routeMeta.options.responseSchema).map(([status, zodSchema]) => [
					status,
					z.toJSONSchema(zodSchema, { target: 'openapi-3.0', unrepresentable: 'any' }),
				]),
			);
		}

		const routeOptions: RouteOptions = {
			method: routeMeta.method.toUpperCase(),
			url: prefix + routeMeta.path,
			handler: async (request: FastifyRequest, reply: FastifyReply) => {
				return handleFastifyRequest(
					(handler as (request: IHttpRequest) => Promise<IHttpResponse<unknown>>).bind(
						controllerInstance,
					),
					request,
					reply,
				);
			},
			...routeMeta.options,
			schema: deepMerge(schema, routeMeta.options.schema as unknown as Partial<typeof schema>),
		};

		routeOptions.preHandler = [];
		if (routeMeta.options.bodySchema) {
			routeOptions.preHandler.push(
				createValidationHook(routeMeta.options.bodySchema, 'Invalid request body', 'body'),
			);
		}
		if (routeMeta.options.querySchema) {
			routeOptions.preHandler.push(
				createValidationHook(routeMeta.options.querySchema, 'Invalid query params', 'query'),
			);
		}

		if (typeof routeMeta.options.authHandler === 'undefined') {
			routeOptions.preHandler.push(defaultApiAuthMiddleware);
		} else if (routeMeta.options.authHandler) {
			if (Array.isArray(routeMeta.options.authHandler)) {
				routeOptions.preHandler.push(...routeMeta.options.authHandler);
			} else {
				routeOptions.preHandler.push(routeMeta.options.authHandler);
			}
		} else if (routeMeta.options.authHandler === false) {
			// no-op: skip authentication for this route
		}

		// Token-type and scope checks run after auth; skipped when authHandler is false.
		if (routeMeta.options.authHandler !== false) {
			// Hidden routes default to session-only; override via config.allowedTokenTypes.
			const explicitAllowed = routeMeta.options.config?.allowedTokenTypes;
			const isHidden = routeMeta.options.schema?.hide === true;
			const effectiveAllowed = explicitAllowed ?? (isHidden ? ['session_token' as const] : null);
			if (effectiveAllowed) {
				routeOptions.preHandler.push(enforceTokenType(effectiveAllowed));
			}

			const requiredScope =
				routeMeta.options.config?.scope ?? resolveScopeForMethod(routeMeta.method);
			if (requiredScope) {
				routeOptions.preHandler.push(enforceScope(requiredScope));
			}
		}

		fastify.route(routeOptions);
	});
}

function createValidationHook<T>(schema: ZodType<T>, errorMessage: string, type: 'body' | 'query') {
	return async (request: FastifyRequest, _reply: FastifyReply) => {
		if (request.headers['content-type']?.startsWith('multipart/form-data')) {
			const formData = await request.formData();
			const body: Record<string, any> = {};
			formData.forEach((value, key) => (body[key] = value));
			request.body = parseJsonFields(body);
		}

		const dataToValidate = type === 'body' ? request.body : qs.parse(request.query as string);
		const validationResult: ReturnType<typeof schema.safeParse> = schema.safeParse(dataToValidate);

		if (!validationResult.success) {
			throw new BadRequestError(errorMessage, validationResult.error);
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { success, ...validatedData } = validationResult;

		if (type === 'body') {
			request.body = validatedData.data;
		} else {
			request.query = validatedData.data;
		}
	};
}

export function resolveClientIp(request: FastifyRequest): string {
	// When the frontend server forwards a scan request, it includes the real scanner IP
	// in x-scanner-ip alongside a valid internal API key. We trust this header only after
	// verifying the key, so external callers cannot spoof their IP.
	//
	// This is checked before cf-connecting-ip on purpose: these are server-to-server calls,
	// so every proxy header on them carries the frontend server's IP, not the scanner's.
	// Preferring those would collapse all scans onto one rate-limit bucket and one geo origin.
	const scannerIp = request.headers['x-scanner-ip'] as string | undefined;
	const apiKey = request.headers['x-internal-api-key'] as string | undefined;
	if (scannerIp && apiKey) {
		const expected = Buffer.from(env.INTERNAL_API_SECRET);
		const received = Buffer.from(apiKey);
		if (expected.length === received.length && crypto.timingSafeEqual(expected, received)) {
			return scannerIp;
		}
	}

	const cfIp = request.headers['cf-connecting-ip'] as string | undefined;
	if (cfIp) return cfIp;

	const xForwardedFor = request.headers['x-forwarded-for'] as string | undefined;
	if (xForwardedFor) {
		return xForwardedFor.split(',')[0].trim();
	}

	return request.ip;
}

const LOGGABLE_HEADERS = [
	'host',
	'user-agent',
	'accept',
	'accept-language',
	'content-type',
	'content-length',
	'referer',
	'origin',
] as const;

function sanitizeHeaders(headers: FastifyRequest['headers']) {
	const sanitized: Record<string, string | string[] | undefined> = {};
	for (const key of LOGGABLE_HEADERS) {
		if (headers[key] !== undefined) {
			sanitized[key] = headers[key];
		}
	}
	return sanitized;
}

export function createRequestLogObject(request: FastifyRequest, additionalData = {}) {
	return {
		id: request.id,
		ip: request.clientIp,
		method: request.method,
		path: request.url,
		user: request.user?.id,
		headers: sanitizeHeaders(request.headers),
		...additionalData,
	};
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
	type FastifyInstance,
	type RegisterOptions,
	type FastifyPluginOptions,
	type FastifyReply,
	type FastifyRequest,
	type RouteOptions,
} from 'fastify';
import { deepMerge, mergeZodErrorObjects } from '@/utils/general';
import { BadRequestError, CustomApiError, UnauthorizedError } from '@/core/error/http';
import { container, type InjectionToken } from 'tsyringe';
import { Logger } from '@/core/logging';
import { ErrorReporter } from '@/core/error';
import { IpAbuseTrackerService } from '@/core/ip-protection';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { ROUTE_METADATA_KEY, type RouteMetadata } from '@/core/decorators/route';
import { type IHttpResponse } from '@/core/interface/response.interface';
import type AbstractController from '@/core/http/controller/abstract.controller';
import { defaultApiAuthMiddleware } from '@/core/http/middleware/default-api-auth.middleware';
import z, { type ZodType } from 'zod';
import qs from 'qs';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';
import { $ZodError } from 'zod/v4/core';
import { addUserToRequestMiddleware } from '@/core/http/middleware/add-user-to-request.middleware';

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

	return Object.freeze({ ...request, cookies }) as T;
};

export const fastifyErrorHandler = (
	error: Error,
	_request: FastifyRequest,
	reply: FastifyReply,
) => {
	const logger = container.resolve(Logger);

	if (error instanceof CustomApiError) {
		const responsePayload: any = {
			message: error.message,
			code: error.statusCode,
		};

		if (error instanceof BadRequestError && error.zodError) {
			const mergedErrors = mergeZodErrorObjects(error.zodError.issues);
			responsePayload.fieldErrors = mergedErrors;
		}

		logger.error('CustomApiError', {
			request: createRequestLogObject(_request),
			error: {
				type: error.constructor.name,
				message: error.message,
				zodErrors: (error as BadRequestError)?.zodError
					? (error as BadRequestError)?.zodError?.issues
					: undefined,
			},
		});

		if (error instanceof UnauthorizedError) {
			container
				.resolve(IpAbuseTrackerService)
				.trackUnauthorizedAttempt(_request.clientIp)
				.catch((err) => logger.error('ip.abuse.tracking.error', { error: err as Error }));
		}

		return reply.status(error.statusCode).send(responsePayload);
	}

	if (error.name === 'SyntaxError') {
		return reply.status(400).send({ message: error.message, code: 400 });
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

		routeOptions.preHandler = [addUserToRequestMiddleware];

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

		const preValidation: ReturnType<typeof createValidationHook>[] = [];
		if (routeMeta.options.bodySchema) {
			preValidation.push(
				createValidationHook(routeMeta.options.bodySchema, 'Invalid request body', 'body'),
			);
		}
		if (routeMeta.options.querySchema) {
			preValidation.push(
				createValidationHook(routeMeta.options.querySchema, 'Invalid query params', 'query'),
			);
		}
		if (preValidation.length > 0) {
			routeOptions.preValidation = preValidation;
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

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
	type FastifyInstance,
	type RegisterOptions,
	type FastifyPluginOptions,
	type FastifyReply,
	type FastifyRequest,
} from 'fastify';
import { mergeZodErrorObjects } from '@/utils/general';
import { BadRequestError, CustomApiError } from '@/core/error/http';
import { container, type InjectionToken } from 'tsyringe';
import { Logger } from '@/core/logging';
import { ErrorReporter } from '@/core/error';
import { type IHttpRequest, type IHttpRequestWithAuth } from '@/core/interface/IRequest';
import { ROUTE_METADATA_KEY, type RouteMetadata } from '@/core/decorators/route';
import { type IHttpResponse } from '@/core/interface/IResponse';
import type AbstractController from '@/core/http/controller/AbstractController';
import { isAuthenticated } from '@/core/http/middleware/auth';
import { type SafeParseReturnType, type ZodSchema } from 'zod';
import qs from 'qs';

/**
 * Parses a Fastify request into an IHttpRequest object.
 * @param request The Fastify request object.
 * @returns The parsed IHttpRequest or IHttpRequestWithAuth object.
 */
export const fastifyRequestParser = <T extends IHttpRequestWithAuth>(
	request: FastifyRequest & { user?: { id: string } },
): T => {
	const { cookies } = request;
	// unsign cookies
	for (const key in cookies) {
		if (cookies[key]) {
			const c = request.unsignCookie(cookies[key]);
			cookies[key] = c.value ?? undefined;
		}
	}
	return Object.freeze({ ...request, cookies }) as T;
};

/**
 * Handles errors in Fastify routes.
 * @param error The error object.
 * @param request The Fastify request object.
 * @param reply The Fastify reply object.
 */
export const fastifyErrorHandler = (
	error: Error,
	_request: FastifyRequest,
	reply: FastifyReply,
) => {
	if (error instanceof CustomApiError) {
		// if error is instance of BadRequestError attach zod errors
		const zodErrors = error instanceof BadRequestError ? error.zodErrors : [];

		const responsePayload: any = {
			message: error.message,
			code: error.statusCode,
		};

		if (zodErrors.length > 0) {
			const mergedErrors = mergeZodErrorObjects(zodErrors);
			responsePayload.fieldErrors = mergedErrors;
		}

		return reply.status(error.statusCode).send(responsePayload);
	}

	if (error.name === 'SyntaxError') {
		throw new BadRequestError(error.message);
	}

	const logger = container.resolve(Logger);
	logger.error(`Unhandled Server error`, error);

	// report error to Analytics
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

/**
 * Handles a Fastify request by resolving the specified controller and invoking its handle method.
 * The response from the controller is then used to set the status code, headers, and body of the reply.
 *
 * @param Controller - The injection token for the controller to handle the request.
 * @param request - The Fastify request object.
 * @param reply - The Fastify reply object.
 * @returns A promise that resolves when the reply has been sent.
 */
export const handleFastifyRequest = async (
	handler: (request: IHttpRequest | IHttpRequestWithAuth) => Promise<IHttpResponse>,
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> => {
	const res = await handler(fastifyRequestParser(request));
	reply.statusCode = res.statusCode;
	void reply.headers(res.headers);
	void reply.send(res.data);
};

/**
 * Registers routes for a Fastify instance based on metadata from the provided controller class.
 * The routes are registered with the specified prefix.
 *
 * @param fastify - The Fastify instance to register the routes with.
 * @param ControllerClass - The controller class containing route metadata.
 * @param prefix - The prefix to be added to the route paths (default is an empty string).
 */
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

		const routeOptions = {
			method: routeMeta.method.toUpperCase(),
			url: prefix + routeMeta.path,
			handler: async (request: FastifyRequest, reply: FastifyReply) => {
				return handleFastifyRequest(
					(
						handler as (
							request: IHttpRequest | IHttpRequestWithAuth,
						) => Promise<IHttpResponse<unknown>>
					).bind(controllerInstance),
					request,
					reply,
				);
			},
			...routeMeta.options,
		};

		// Add authentication prehandler
		if (!routeMeta.options.skipAuth) {
			routeOptions.preHandler = isAuthenticated;
		}

		// Add request body validation
		if (routeMeta.options.bodySchema) {
			routeOptions.preValidation = createValidationHook(
				routeMeta.options.bodySchema,
				'Invalid request body',
				'body',
			);
		}

		// Add request query validation
		if (routeMeta.options.querySchema) {
			routeOptions.preValidation = createValidationHook(
				routeMeta.options.querySchema,
				'Invalid query params',
				'query',
			);
		}

		fastify.route(routeOptions);
	});
}

function createValidationHook<T>(
	schema: ZodSchema<T>,
	errorMessage: string,
	type: 'body' | 'query',
) {
	return (request: FastifyRequest, _reply: FastifyReply, done: () => void) => {
		const dataToValidate =
			type === 'body'
				? request.body
				: Object.fromEntries(
						Object.entries(request.query || {}).map(([key, value]) => [
							key,
							key !== 'where' ? value : qs.parse(value as string),
						]),
					);
		const validationResult: SafeParseReturnType<T, T> = schema.safeParse(dataToValidate);
		if (!validationResult.success) {
			throw new BadRequestError(errorMessage, validationResult.error.issues);
		}

		// Override the body or query object with the validated data
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { success, ...validatedData } = validationResult;
		if (type === 'body') {
			request.body = validatedData.data;
		} else {
			request.query = validatedData.data;
		}

		done();
	};
}

import { type HTTPMethods, type RouteShorthandOptions } from 'fastify';
import { type ZodSchema } from 'zod';
import { DeleteResponseSchema } from '../domain/schema/DeleteResponseSchema';
import { DEFAULT_ERROR_RESPONSES } from '../error/http/error.schemas';

export type HandlerName = string;
export type Constructable<T = unknown> = new (...args: unknown[]) => T;
export type ControllerClass = Constructable<object> &
	Record<HandlerName, (...args: unknown[]) => Promise<unknown>>;

// Define a type for the HTTP methods
type Method = Lowercase<HTTPMethods>;

// Define an interface for additional route options specific to your decorator
interface CustomRouteOptions {
	skipAuth?: boolean;
	bodySchema?: ZodSchema;
	querySchema?: ZodSchema;
	responseSchema?: Record<number, ZodSchema>;
}

// Merge Fastify's RouteOptions with your custom options
export type RouteOptions = RouteShorthandOptions & CustomRouteOptions;

// Define an interface to store route metadata
export interface RouteMetadata {
	method: Method;
	path: string;
	handlerName: HandlerName;
	options: RouteOptions;
	schema?: RouteOptions['schema'];
}

// Define a symbol to store the route metadata on the controller prototype
export const ROUTE_METADATA_KEY = Symbol('routes');

// RouteFactory function to create method decorators for different HTTP methods
const RouteFactory =
	(method: Method, defaultResponseSchema?: Record<number, ZodSchema>) =>
	(path: string, options: RouteOptions = {}): MethodDecorator =>
	(target: object, handlerName: string | symbol) => {
		options.responseSchema = { ...options.responseSchema, ...defaultResponseSchema };
		const routeMetadata: RouteMetadata = {
			method,
			path,
			handlerName: String(handlerName),
			options,
		};

		// Store all route metadata on the controller constructor
		if (!Reflect.hasMetadata(ROUTE_METADATA_KEY, target.constructor)) {
			Reflect.defineMetadata(ROUTE_METADATA_KEY, [], target.constructor);
		}
		const routes = Reflect.getMetadata(ROUTE_METADATA_KEY, target.constructor) as RouteMetadata[];
		routes.push(routeMetadata);
	};

// Export HTTP method decorator factories
export const Get = RouteFactory('get', {
	401: DEFAULT_ERROR_RESPONSES[401],
	403: DEFAULT_ERROR_RESPONSES[403],
	404: DEFAULT_ERROR_RESPONSES[404],
	429: DEFAULT_ERROR_RESPONSES[429],
});
export const Post = RouteFactory('post', {
	400: DEFAULT_ERROR_RESPONSES[400],
	401: DEFAULT_ERROR_RESPONSES[401],
	403: DEFAULT_ERROR_RESPONSES[403],
	404: DEFAULT_ERROR_RESPONSES[404],
	429: DEFAULT_ERROR_RESPONSES[429],
});
export const Put = RouteFactory('put', {
	400: DEFAULT_ERROR_RESPONSES[400],
	401: DEFAULT_ERROR_RESPONSES[401],
	403: DEFAULT_ERROR_RESPONSES[403],
	404: DEFAULT_ERROR_RESPONSES[404],
	429: DEFAULT_ERROR_RESPONSES[429],
});
export const Patch = RouteFactory('patch', {
	400: DEFAULT_ERROR_RESPONSES[400],
	401: DEFAULT_ERROR_RESPONSES[401],
	403: DEFAULT_ERROR_RESPONSES[403],
	404: DEFAULT_ERROR_RESPONSES[404],
	429: DEFAULT_ERROR_RESPONSES[429],
});
export const Delete = RouteFactory('delete', {
	200: DeleteResponseSchema,
	401: DEFAULT_ERROR_RESPONSES[401],
	403: DEFAULT_ERROR_RESPONSES[403],
	404: DEFAULT_ERROR_RESPONSES[404],
	429: DEFAULT_ERROR_RESPONSES[429],
});

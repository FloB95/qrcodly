import { type HTTPMethods, type RouteShorthandOptions } from 'fastify';
import { type preHandlerMetaHookHandler } from 'fastify/types/hooks';
import { type ZodSchema } from 'zod';
import { type RateLimitPolicy } from '../rate-limit/rate-limit.policy';

export type HandlerName = string;
export type Constructable<T = unknown> = new (...args: unknown[]) => T;
export type ControllerClass = Constructable<object> &
	Record<HandlerName, (...args: unknown[]) => Promise<unknown>>;

// Define a type for the HTTP methods
type Method = Lowercase<HTTPMethods>;

// Define an interface for additional route options specific to your decorator
interface CustomRouteOptions {
	authHandler?: preHandlerMetaHookHandler | false;
	bodySchema?: ZodSchema;
	querySchema?: ZodSchema;
	responseSchema?: Record<number, ZodSchema>;
	config?: {
		rateLimitPolicy?: RateLimitPolicy;
	};
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
	(method: Method) =>
	(path: string, options: RouteOptions = {}): MethodDecorator =>
	(target: object, handlerName: string | symbol) => {
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
export const Get = RouteFactory('get');
export const Post = RouteFactory('post');
export const Put = RouteFactory('put');
export const Patch = RouteFactory('patch');
export const Delete = RouteFactory('delete');

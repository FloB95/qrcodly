import { container } from 'tsyringe';
import { DEFAULT_SHUTDOWN_PRIORITY } from '../config/constants';
import { type ServiceClass, ShutdownService } from '../services/shutdown.service';

/**
 * Decorator that registers a method as a shutdown hook. The method will
 * be called when the application is shutting down.
 *
 * Priority is used to determine the order in which the hooks are called.
 *
 * @example
 * ```ts
 * class MyClass {
 *   @OnShutdown()
 *   async shutdown() {
 * 	   // Will be called when the app is shutting down
 *   }
 * }
 * ```
 */
export const OnShutdown =
	(priority = DEFAULT_SHUTDOWN_PRIORITY): MethodDecorator =>
	(prototype, propertyKey, descriptor) => {
		const serviceClass = prototype.constructor as ServiceClass;
		const methodName = String(propertyKey);
		if (typeof descriptor?.value === 'function') {
			container.resolve(ShutdownService).register(priority, { serviceClass, methodName });
		} else {
			const name = `${serviceClass.name}.${methodName}()`;
			throw new Error(`${name} must be a method on ${serviceClass.name} to use "OnShutdown"`);
		}
	};

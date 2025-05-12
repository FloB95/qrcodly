import { container, inject, singleton } from 'tsyringe';
import { Logger } from '../logging';
import { HIGHEST_SHUTDOWN_PRIORITY, LOWEST_SHUTDOWN_PRIORITY } from '../config/constants';

type HandlerFn = () => Promise<void> | void;
type Class<T = object, A extends unknown[] = unknown[]> = new (...args: A) => T;
export type ServiceClass = Class<Record<string, HandlerFn>>;

export interface ShutdownHandler {
	serviceClass: ServiceClass;
	methodName: string;
}

/** Service responsible for orchestrating a graceful shutdown of the application */
@singleton()
export class ShutdownService {
	private readonly handlersByPriority: ShutdownHandler[][] = [];

	private shutdownPromise: Promise<void> | undefined;

	constructor(@inject(Logger) private readonly logger: Logger) {}

	/** Registers given listener to be notified when the application is shutting down */
	register(priority: number, handler: ShutdownHandler) {
		if (priority < LOWEST_SHUTDOWN_PRIORITY || priority > HIGHEST_SHUTDOWN_PRIORITY) {
			throw new Error(
				`Invalid shutdown priority. Please set it between ${LOWEST_SHUTDOWN_PRIORITY} and ${HIGHEST_SHUTDOWN_PRIORITY}.`,
			);
		}

		if (!this.handlersByPriority[priority]) {
			this.handlersByPriority[priority] = [];
		}
		this.handlersByPriority[priority].push(handler);
	}

	/** Validates that all the registered shutdown handlers are properly configured */
	validate() {
		const handlers = this.handlersByPriority.flat();

		for (const { serviceClass, methodName } of handlers) {
			if (!container.isRegistered(serviceClass)) {
				throw new Error(
					`Component "${serviceClass.name}" is not registered with the DI container. Any component using @OnShutdown() must be decorated with @Service()`,
				);
			}

			const service = container.resolve(serviceClass);
			if (!service[methodName]) {
				throw new Error(`Component "${serviceClass.name}" does not have a "${methodName}" method`);
			}
		}
	}

	/** Signals all registered listeners that the application is shutting down */
	shutdown() {
		if (this.shutdownPromise) {
			throw new Error('App is already shutting down');
		}

		this.shutdownPromise = this.startShutdown();
	}

	/** Returns a promise that resolves when all the registered listeners have shut down */
	async waitForShutdown(): Promise<void> {
		if (!this.shutdownPromise) {
			throw new Error('App is not shutting down');
		}

		await this.shutdownPromise;
	}

	isShuttingDown() {
		return !!this.shutdownPromise;
	}

	private async startShutdown() {
		const handlers = Object.values(this.handlersByPriority).reverse();
		for (const handlerGroup of handlers) {
			await Promise.allSettled(
				handlerGroup.map(async (handler) => await this.shutdownComponent(handler)),
			);
		}
	}

	private async shutdownComponent({ serviceClass, methodName }: ShutdownHandler) {
		const name = `${serviceClass.name}.${methodName}()`;
		try {
			if (!container.isRegistered(serviceClass)) {
				this.logger.error(
					`Component "${name}" is not registered with the DI container. Skipping shutdown.`,
				);
				return;
			}
			const service = container.resolve(serviceClass);
			const method = service[methodName];
			await method.call(service);
		} catch (error) {
			this.logger.error(`Error shutting down component "${name}"`, { error });
			throw new Error(`Error shutting down component "${name}"`);
		}
	}
}

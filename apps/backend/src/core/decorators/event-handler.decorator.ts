import { container } from 'tsyringe';
import { EventEmitter } from '../event/event.emitter';
import { AbstractEventHandler } from '../event/handler/abstract.event-handler';
import { Logger } from '../logging';

/**
 * Decorator to register a class as an event handler for a specific event.
 *
 * @param eventName - The name of the event to handle.
 *
 */
export function EventHandler(eventName: string): ClassDecorator {
	return (target) => {
		const emitter = container.resolve(EventEmitter);
		const handlerInstance = new (target as unknown as new () => AbstractEventHandler<unknown>)();

		if (!(handlerInstance instanceof AbstractEventHandler)) {
			throw new Error(
				`Class ${target.name} must extend AbstractEventHandler to use "EventHandler"`,
			);
		}

		container
			.resolve(Logger)
			.debug(`Registering event handler for event "${eventName}": ${target.name}`);
		emitter.on(eventName, (event) => void handlerInstance.handle(event));
	};
}

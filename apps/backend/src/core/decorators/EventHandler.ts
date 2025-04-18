import { container } from 'tsyringe';
import { EventEmitter } from '../event/EventEmitter';
import { AbstractEventHandler } from '../event/handler/AbstractEventHandler';

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

		emitter.on(eventName, (event) => void handlerInstance.handle(event));
	};
}

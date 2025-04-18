import { type AbstractEvent } from '../event/AbstractEvent';

/**
 * Represents an event emitter.
 */
export interface IEventEmitter {
	/**
	 * Emits an event.
	 * @param {AbstractEvent} event - The event to emit.
	 */
	emit(event: AbstractEvent): void;

	/**
	 * Registers a listener for an event.
	 * @param {string} event - The name of the event.
	 * @param {(event: T) => void} listener - The listener function.
	 * @template T - The type of the event.
	 */
	on<T>(event: string, listener: (event: T) => void): void;

	/**
	 * Removes a listener for an event.
	 * @param {string} eventName - The name of the event.
	 * @param {(event: T) => void} listener - The listener function.
	 * @template T - The type of the event.
	 */
	off<T>(eventName: string, listener: (event: T) => void): void;
}

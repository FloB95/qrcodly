import { type BaseEvent } from "./BaseEvent";

/**
 * Represents an event emitter.
 */
export interface IEventEmitter {
  /**
   * Emits an event.
   * @param {BaseEvent} event - The event to emit.
   */
  emit(event: BaseEvent): void;

  /**
   * Registers a listener for an event.
   * @param {string} event - The name of the event.
   * @param {(event: T) => void} listener - The listener function.
   * @template T - The type of the event.
   */
  on<T>(event: string, listener: (event: T) => void): void;
}
